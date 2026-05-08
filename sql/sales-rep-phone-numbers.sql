-- ============================================================
-- sales_rep_phone_numbers
-- ============================================================
-- Reps can rotate between up to 3 Telnyx DIDs as their outbound
-- caller-ID. Pre-existed model held only one number per rep on
-- sales_reps.telnyx_outbound_number; that column stays as a
-- bootstrap / fallback so existing reps don't break, but the new
-- picker UI works off this table.
--
-- Cap of 3 is enforced in code, not at the DB - the eviction logic
-- needs to do a Telnyx release call before deleting the row, so a
-- DB-level constraint would just throw at the wrong layer.
-- ============================================================

create table if not exists sales_rep_phone_numbers (
  id            uuid primary key default gen_random_uuid(),
  rep_id        uuid not null references custom_users(id) on delete cascade,
  phone_number  text not null,
  -- Telnyx phone resource id (data.id from /v2/phone_numbers) so we
  -- can DELETE it on eviction and stop being billed for it.
  phone_id      text not null,
  label         text,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (rep_id, phone_number)
);

create index if not exists sales_rep_phone_numbers_rep_idx
  on sales_rep_phone_numbers (rep_id, created_at desc);

-- Only one active number per rep. Partial unique index lets us flip
-- the active flag with a transaction (set new = true, set old = false).
create unique index if not exists sales_rep_phone_numbers_one_active
  on sales_rep_phone_numbers (rep_id) where is_active;
