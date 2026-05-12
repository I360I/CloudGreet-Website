-- Self-serve account-creation invites.
--
-- Rep clicks "Send create-account link" or "Copy create-account link" on a
-- lead/close. We mint a row in this table, give the rep a public URL
-- (cloudgreet.com/create-account?token=...), the prospect opens it,
-- picks a password, and the public accept endpoint provisions their
-- account in one shot - same convertCloseToClient path the rep-initiated
-- flow uses, just with the prospect picking their own password.
--
-- Idempotent + safe to re-run.

create extension if not exists pgcrypto;

create table if not exists client_account_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  rep_id uuid not null references custom_users(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  prospect_email text not null,
  prospect_business_name text,
  prospect_contact_name text,
  prospect_phone text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  consumed_at timestamptz,
  consumed_business_id uuid references businesses(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_account_invites_token_idx on client_account_invites(token);
create index if not exists client_account_invites_rep_idx on client_account_invites(rep_id);
create index if not exists client_account_invites_email_idx on client_account_invites(prospect_email);

notify pgrst, 'reload schema';
