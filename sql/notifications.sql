-- Notifications system: a single table that fans out to admin OR a
-- specific rep OR a specific business owner, depending on audience.
--
-- audience_type: 'admin' | 'rep' | 'business'
-- audience_id:   null when audience='admin' (any admin sees them);
--                rep's user_id when audience='rep';
--                business_id when audience='business'.
--
-- Severity drives color in the UI: info / success / warning / critical.
-- type is a stable string we filter on (e.g. 'close_submitted').
--
-- Read state is per-row; mark_read endpoint flips read_at to now().

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  audience_type text not null check (audience_type in ('admin','rep','business')),
  audience_id uuid,
  type text not null,
  title text not null,
  body text,
  link text,
  icon text,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists app_notifications_admin_idx
  on public.app_notifications (audience_type, read_at, created_at desc)
  where audience_type = 'admin';

create index if not exists app_notifications_rep_idx
  on public.app_notifications (audience_type, audience_id, read_at, created_at desc)
  where audience_type = 'rep';

create index if not exists app_notifications_business_idx
  on public.app_notifications (audience_type, audience_id, read_at, created_at desc)
  where audience_type = 'business';
