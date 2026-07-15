-- Pre-link a closer (sales rep) to a setter invite so the assignment carries
-- to the new account on accept (mirrors the pay/goal pre-config in
-- sql/setter-invite-pay.sql). accept-invite copies this into
-- custom_users.assigned_rep_id, which is what routes the setter's booked
-- demos into that rep's pipeline. Applied live 2026-07-15.
alter table public.setter_invites
  add column if not exists assigned_rep_id uuid references public.custom_users(id) on delete set null;

comment on column public.setter_invites.assigned_rep_id is
  'Optional closer (sales rep) to link the new setter to on accept; accept-invite copies it to custom_users.assigned_rep_id so setter demos route into that rep''s pipeline.';
