-- usage_costs: per-client cost-to-serve ledger.
--
-- One row per cost EVENT (a call, an LLM turn, an SMS segment batch, a
-- Stripe fee). amount_cents is what the event costs US (not what we bill
-- the client). The admin client view aggregates this by provider to show
-- cost vs revenue (margin). Allocated flat infra (Vercel/Supabase/Cal.com)
-- is computed at read time, not stored here - this table is measured cost.
--
-- Idempotency: (provider, kind, ref_id) is unique where ref_id is set, so
-- re-firing a Retell/Stripe webhook or re-running the backfill never
-- double-counts. ref_id is the provider's own id (retell_call_id, Telnyx
-- message_id, Stripe invoice id).
--
-- Idempotent: safe to re-run.

create table if not exists public.usage_costs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  provider text not null,        -- retell | anthropic | telnyx | google | stripe
  kind text not null,            -- voice | llm | sms | routes | fee
  amount_cents integer not null default 0,
  quantity numeric,              -- minutes | tokens | segments | calls
  unit text,                     -- minute | token | segment | call
  ref_type text,                 -- call | sms | invoice | message
  ref_id text,                   -- provider id, for idempotency
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Full (non-partial) unique index so it can serve as an ON CONFLICT target
-- for upserts. NULLs are distinct in a Postgres unique index, so rows with
-- no ref_id (e.g. an SMS turn with no Telnyx message id) are still allowed;
-- only non-null provider+kind+ref_id triples are de-duplicated.
create unique index if not exists usage_costs_provider_kind_ref_key
  on public.usage_costs (provider, kind, ref_id);

create index if not exists usage_costs_business_occurred_idx
  on public.usage_costs (business_id, occurred_at desc);
