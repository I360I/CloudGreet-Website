-- ============================================================
-- Phase 0 — Sales rep + commission schema
-- ============================================================
-- New surface area for the commission-only sales team:
--   · sales_reps            — per-rep KYC, Stripe Connect, status
--   · closes                — rep-submitted deal pipeline
--   · commission_ledger     — one row per paid invoice; the source of
--                             truth for 'what we owe each rep'
--   · payouts               — Friday batch transfers via Stripe Connect
--   · lead_assignments      — link reps to leads (existing scraper rows)
--
-- Plus three columns on businesses:
--   · rep_id, monthly_price_cents, setup_fee_cents
--
-- All idempotent so re-running on a fresh DB or one mid-migration is safe.
-- ============================================================

-- 1. Profile/KYC for users with role='sales'. Auth itself stays on
--    custom_users; this row holds rep-specific data.
create table if not exists sales_reps (
  id                       uuid primary key references custom_users(id) on delete cascade,
  legal_name               text,
  street_address           text,
  city                     text,
  state                    text,
  zip_code                 text,
  tax_id_last4             text,
  agreement_version        text,
  agreement_signed_at      timestamptz,
  stripe_connect_account_id text unique,
  stripe_connect_charges_enabled  boolean default false,
  stripe_connect_payouts_enabled  boolean default false,
  stripe_connect_details_submitted boolean default false,
  demo_business_id         uuid references businesses(id) on delete set null,
  status                   text not null default 'active' check (status in ('active','paused','terminated')),
  terminated_at            timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists sales_reps_status_idx on sales_reps (status);

-- 2. Deals submitted by reps. A close lives here from the moment the
--    rep marks 'I closed someone' through to the business being
--    created and starting to pay.
create table if not exists closes (
  id                     uuid primary key default gen_random_uuid(),
  rep_id                 uuid not null references custom_users(id) on delete restrict,
  business_id            uuid references businesses(id) on delete set null,
  prospect_business_name text not null,
  prospect_contact_name  text,
  prospect_email         text,
  prospect_phone         text,
  agreed_monthly_cents   integer not null,
  agreed_setup_fee_cents integer default 0,
  notes                  text,
  status                 text not null default 'pending'
    check (status in ('pending','invoice_sent','paid','cancelled','rejected')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists closes_rep_idx       on closes (rep_id, created_at desc);
create index if not exists closes_business_idx  on closes (business_id);
create index if not exists closes_status_idx    on closes (status);

-- 3. Commission ledger — the source of truth. One row per paid invoice
--    item that earns a commission. UNIQUE(invoice_id, source_type)
--    so the Stripe webhook can't double-credit on retries.
create table if not exists commission_ledger (
  id                  uuid primary key default gen_random_uuid(),
  rep_id              uuid not null references custom_users(id) on delete restrict,
  business_id         uuid not null references businesses(id) on delete cascade,
  close_id            uuid references closes(id) on delete set null,
  source_type         text not null check (source_type in ('mrr','setup_fee')),
  source_invoice_id   text not null,
  gross_paid_cents    integer not null,
  commission_cents    integer not null,
  earned_at           timestamptz not null,
  payout_id           uuid,
  created_at          timestamptz not null default now(),
  unique (source_invoice_id, source_type)
);

create index if not exists commission_rep_unpaid_idx
  on commission_ledger (rep_id, payout_id) where payout_id is null;
create index if not exists commission_rep_earned_idx
  on commission_ledger (rep_id, earned_at desc);
create index if not exists commission_business_idx
  on commission_ledger (business_id);

-- 4. Payouts — one row per Friday batch per rep.
create table if not exists payouts (
  id                  uuid primary key default gen_random_uuid(),
  rep_id              uuid not null references custom_users(id) on delete restrict,
  amount_cents        integer not null,
  period_start        date not null,
  period_end          date not null,
  stripe_transfer_id  text unique,
  status              text not null default 'pending'
    check (status in ('pending','transferred','failed','reversed')),
  failure_reason      text,
  transferred_at      timestamptz,
  created_at          timestamptz not null default now()
);

create index if not exists payouts_rep_idx    on payouts (rep_id, created_at desc);
create index if not exists payouts_status_idx on payouts (status);

-- Now that payouts exists, add the FK back on commission_ledger.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'commission_ledger_payout_fk'
  ) then
    alter table commission_ledger
      add constraint commission_ledger_payout_fk
      foreign key (payout_id) references payouts(id) on delete set null;
  end if;
end$$;

-- 5. Lead → rep assignment. Reuses the existing leads table from the
--    scraper. Composite PK so a rep can claim a lead at most once.
create table if not exists lead_assignments (
  lead_id     uuid not null,
  rep_id      uuid not null references custom_users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  claimed     boolean not null default true,
  primary key (lead_id, rep_id)
);

create index if not exists lead_assignments_rep_idx on lead_assignments (rep_id, assigned_at desc);

-- 6. Tie businesses to the rep that brought them, plus the negotiated
--    price (overrides the $499/$899 defaults). monthly_price_cents
--    being null means 'use the default Stripe price ID flow'.
alter table businesses
  add column if not exists rep_id              uuid references custom_users(id) on delete set null,
  add column if not exists monthly_price_cents integer,
  add column if not exists setup_fee_cents     integer;

create index if not exists businesses_rep_idx on businesses (rep_id);
