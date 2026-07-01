create table if not exists public.demo_agent_calls (
  id            uuid        primary key default gen_random_uuid(),
  retell_call_id text       unique not null,
  agent_id      text        not null,
  vertical      text        not null,
  from_number   text,
  duration_sec  int,
  status        text        default 'completed',
  summary       text,
  created_at    timestamptz default now()
);

create index if not exists demo_agent_calls_created_at_idx on public.demo_agent_calls (created_at desc);
