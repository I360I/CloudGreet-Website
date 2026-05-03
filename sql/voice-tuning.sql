-- Per-client AI voice override.
-- Without this column, retell-agent-manager auto-picks an 11labs voice
-- from business_type. With it, the admin can override on /admin/clients/[id].

alter table businesses
  add column if not exists voice_id text;
