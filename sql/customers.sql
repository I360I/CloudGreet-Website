-- 2026-05-29: customers table for per-business contact memory.
--
-- We were tracking callers implicitly via the `calls` table + the
-- caller_history lookup that scans recent calls for a phone match.
-- That works for "what was the last service?" but isn't a place to
-- store stable per-customer fields like email. Adding a dedicated
-- table so the agent can ask once, save it, and never ask again.
--
-- Keyed on (business_id, phone_digits) - phone_digits is the normalized
-- digits-only form used elsewhere in caller-history, so lookups stay
-- O(1) regardless of how the inbound number was formatted.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  phone_digits text not null,
  name text,
  email text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, phone_digits)
);

create index if not exists customers_business_phone_idx on customers (business_id, phone_digits);
create index if not exists customers_email_idx on customers (business_id, email) where email is not null;
