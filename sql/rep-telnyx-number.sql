-- Per-rep Telnyx DID for outbound caller ID. Provisioned automatically
-- on invite acceptance, falls back to the shared env-default if unset.
alter table sales_reps
  add column if not exists telnyx_outbound_number text,
  add column if not exists telnyx_phone_id text,
  add column if not exists telnyx_provisioned_at timestamptz,
  add column if not exists telnyx_provision_error text;

create index if not exists sales_reps_telnyx_phone_id_idx
  on sales_reps (telnyx_phone_id)
  where telnyx_phone_id is not null;
