-- Demo calendar mirror mapping.
--
-- The demo-calendar-mirror cron reads every rep's Cal.com upcoming demos and
-- creates a matching booking on the owner's `cloudgreet` Cal.com hub (event
-- type 5553191), whose destination calendar is the owner's Apple iCloud. That
-- lands every demo on the owner's Apple automatically. This table maps each
-- source rep booking to the hub booking we created, so the cron is idempotent
-- (never double-creates) and can cancel the mirror if the source is cancelled.
--
-- status: 'active' (mirror live), 'completed' (source demo happened, mirror
-- left in place as a past event), 'cancelled' (source cancelled, mirror cancelled).

create table if not exists public.demo_calendar_mirrors (
  rep_booking_uid  text primary key,
  rep_booking_url  text,
  hub_booking_uid  text not null,
  prospect         text,
  start_time       timestamptz,
  status           text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists demo_calendar_mirrors_status_idx
  on public.demo_calendar_mirrors (status);

-- Seed the two demos already mirrored by hand (Florin Aug 7, Antoine Aug 10)
-- so the first cron tick does not create duplicates on the owner's Apple.
insert into public.demo_calendar_mirrors
  (rep_booking_uid, rep_booking_url, hub_booking_uid, prospect, start_time, status)
values
  ('cnBUYcHgEdpdePH7NR4Qrq', 'https://cal.com/cld-agent/demo', '4ZMF5nA2QR5fjBRwQDqCZE', 'Florin Matranxhi', '2026-08-07T16:00:00Z', 'active'),
  ('sb4kzSX98R31oVWD9YBLtu', 'https://cal.com/cld-agent/demo', 'mkLiPJVxmPmZ73R21K4QEg', 'Antoine Holt',     '2026-08-10T15:00:00Z', 'active')
on conflict (rep_booking_uid) do nothing;
