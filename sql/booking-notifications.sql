-- Booking notification SMS settings on the business row.
-- The contractor gets a text the moment the AI books a job. One number,
-- one editable template per business. See lib/booking-notifications.ts
-- for the renderer + default template.

alter table businesses
  add column if not exists notifications_phone   text,
  add column if not exists booking_sms_template  text;

create index if not exists businesses_notif_phone_idx
  on businesses (notifications_phone) where notifications_phone is not null;
