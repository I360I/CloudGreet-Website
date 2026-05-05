-- Per-rep price caps for self-serve payment links. The rep's
-- /sales/closes "Generate payment link" button will reject any
-- close whose agreed amounts exceed these caps, sending the rep
-- to admin for approval. Admin can raise caps per rep from
-- /admin/sales/[id] (mirrors the lead-scrape-limit field).
--
-- Defaults are conservative: $1,500/mo and $1,500 setup. Bump
-- per-rep as you trust them.
alter table public.sales_reps
  add column if not exists max_monthly_cents integer not null default 150000,
  add column if not exists max_setup_cents   integer not null default 150000;
