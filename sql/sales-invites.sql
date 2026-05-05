-- One-time invite tokens for new sales reps. Admin creates → emails the
-- link to the rep → rep opens it once to set a password and sign the
-- agreement. Token consumed on first use.
create table if not exists sales_rep_invites (
  token         text primary key,
  email         text not null,
  invited_by    uuid references custom_users(id) on delete set null,
  invited_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  consumed_at   timestamptz,
  consumed_by   uuid references custom_users(id) on delete set null
);

create index if not exists sales_rep_invites_email_idx on sales_rep_invites (email);
create index if not exists sales_rep_invites_open_idx on sales_rep_invites (consumed_at) where consumed_at is null;
