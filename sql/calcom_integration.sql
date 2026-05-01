-- Cal.com integration columns.
-- Run this once in Supabase SQL editor.

alter table public.businesses
  add column if not exists cal_com_api_key text,
  add column if not exists cal_com_user_id integer,
  add column if not exists cal_com_username text,
  add column if not exists cal_com_event_type_id integer,
  add column if not exists cal_com_event_type_slug text,
  add column if not exists cal_com_webhook_id text,
  add column if not exists cal_com_webhook_secret text,
  add column if not exists calcom_connected boolean not null default false,
  add column if not exists calcom_connected_at timestamptz;

alter table public.appointments
  add column if not exists cal_com_booking_uid text,
  add column if not exists cal_com_booking_id integer;

create index if not exists appointments_calcom_uid_idx
  on public.appointments (cal_com_booking_uid);

-- Onboarding state per business.
alter table public.businesses
  add column if not exists onboarding_step text not null default 'profile',
  add column if not exists forwarding_carrier text,
  add column if not exists forwarding_line_type text,
  add column if not exists forwarding_mode text,
  add column if not exists forwarding_verified_at timestamptz;
