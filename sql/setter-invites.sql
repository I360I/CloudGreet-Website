-- One-time invite tokens for new setters. Mirrors sales_rep_invites
-- (sql/sales-invites.sql) exactly, kept as a separate table rather than
-- overloading the sales invite flow - setter accept-invite has no
-- Stripe Connect / 1099 contractor agreement step, which would be wrong
-- to show a plain setter employee.
create table if not exists setter_invites (
  token         text primary key,
  email         text not null,
  invited_by    uuid references custom_users(id) on delete set null,
  invited_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  consumed_at   timestamptz,
  consumed_by   uuid references custom_users(id) on delete set null
);

create index if not exists setter_invites_email_idx on setter_invites (email);
create index if not exists setter_invites_open_idx on setter_invites (consumed_at) where consumed_at is null;
