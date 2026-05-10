-- Password reset tokens.
-- Token value is hashed (sha256) at rest so a DB leak can't be turned
-- into a reset-anyone link. Single-use, 1-hour expiry.

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.custom_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now(),
  request_ip text
);

create index if not exists idx_password_reset_tokens_user
  on public.password_reset_tokens (user_id);

create index if not exists idx_password_reset_tokens_unused
  on public.password_reset_tokens (expires_at)
  where used_at is null;
