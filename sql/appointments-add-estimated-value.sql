-- create_appointment_safe inserts into appointments.estimated_value
-- but the column was never added to the table. Every Retell-driven
-- booking fails with "column estimated_value of relation appointments
-- does not exist" (Postgres code 42703). The agent then tells the
-- caller "calendar's giving me trouble" with no booking saved and
-- no Cal.com sync.
--
-- Idempotent. Default null because we currently don't ask the caller
-- their budget on the voice call - we collect it only when the rep
-- enters it manually.

alter table public.appointments
  add column if not exists estimated_value numeric;

-- Same for any other "optional" fields the RPC writes that might be
-- missing on older schemas. Adding them all here so a single migration
-- fixes the booking path everywhere.
alter table public.appointments
  add column if not exists address text;

alter table public.appointments
  add column if not exists notes text;

alter table public.appointments
  add column if not exists customer_email text;

alter table public.appointments
  add column if not exists duration integer;

notify pgrst, 'reload schema';
