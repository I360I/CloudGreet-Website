-- Record the setter-fed classification + base rate on each commission row.
-- The Stripe webhook (creditRepCommission) reads closes.set_by_setter_id to
-- decide the rate: 50% self-sourced, 25% setter-fed, and stamps both fields
-- for audit. Applied live 2026-07-15.
alter table public.commission_ledger
  add column if not exists is_setter_fed boolean not null default false,
  add column if not exists commission_rate numeric;

comment on column public.commission_ledger.is_setter_fed is
  'True if the close was booked by a setter (closes.set_by_setter_id present) and therefore paid at the setter-fed rate.';
comment on column public.commission_ledger.commission_rate is
  'The base commission fraction applied to this row (0.50 self-sourced, 0.25 setter-fed). Recorded for audit.';
