-- Emergency-aware booking pipeline.
--
-- Adds three pieces of state so the AI can flag a booking as emergency
-- and the system can route it differently:
--   1. appointments.is_emergency   - per-booking flag for the dashboard
--                                    + audit trail. Set when the agent
--                                    classifies the call as emergency.
--   2. businesses.booking_sms_template_emergency
--                                  - separate template for the owner
--                                    SMS so an emergency text is
--                                    visually distinct from a routine
--                                    new-booking ping.
--   3. businesses.cal_com_event_type_id_emergency
--                                  - optional separate Cal.com event
--                                    type for emergency slots (lets
--                                    the contractor configure
--                                    "Emergency dispatch" with
--                                    different availability /
--                                    confirmation rules in Cal.com).
--                                    Falls back to the normal event
--                                    type when null.
--
-- Idempotent: if-not-exists patterns throughout.

alter table appointments
  add column if not exists is_emergency boolean not null default false;

create index if not exists appointments_is_emergency_idx
  on appointments (business_id, scheduled_date)
  where is_emergency = true;

alter table businesses
  add column if not exists booking_sms_template_emergency text,
  add column if not exists cal_com_event_type_id_emergency integer;

-- create_appointment_safe needs to accept the is_emergency flag so the
-- voice webhook can stamp it atomically alongside the rest of the
-- booking insert.
--
-- Re-issued with the existing arg shape + p_is_emergency appended with
-- a default of false. Backward-compatible: existing callers that omit
-- the arg get false. The voice webhook now passes it explicitly.
create or replace function create_appointment_safe(
  p_business_id     uuid,
  p_customer_name   text,
  p_customer_phone  text,
  p_customer_email  text default null,
  p_service_type    text default null,
  p_scheduled_date  timestamptz default null,
  p_start_time      timestamptz default null,
  p_end_time        timestamptz default null,
  p_duration        integer default 60,
  p_estimated_value numeric default null,
  p_address         text default null,
  p_notes           text default null,
  p_is_emergency    boolean default false
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  insert into appointments (
    business_id, customer_name, customer_phone, customer_email,
    service_type, scheduled_date, start_time, end_time, duration,
    estimated_value, address, notes, is_emergency, status
  ) values (
    p_business_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_type, p_scheduled_date, p_start_time, p_end_time, coalesce(p_duration, 60),
    p_estimated_value, p_address, p_notes, coalesce(p_is_emergency, false), 'scheduled'
  )
  returning id into v_id;
  return v_id;
end;
$$;
