-- create_appointment_safe(...)
--
-- Atomic-ish appointment insert. Called by:
--   - app/api/retell/voice-webhook/route.ts  (every AI booking attempt)
--   - app/api/appointments/create/route.ts   (manual REST create)
--   - lib/health-check.ts                    (synthetic probe)
--
-- Returns the new appointment id. Conflict detection is done at the
-- caller layer (it queries for overlapping start/end before calling
-- this), so this function just inserts and returns the id.

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
  p_notes           text default null
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
    estimated_value, address, notes, status
  ) values (
    p_business_id, p_customer_name, p_customer_phone, p_customer_email,
    p_service_type, p_scheduled_date, p_start_time, p_end_time, coalesce(p_duration, 60),
    p_estimated_value, p_address, p_notes, 'scheduled'
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function create_appointment_safe(uuid, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, numeric, text, text) to service_role;

notify pgrst, 'reload schema';
