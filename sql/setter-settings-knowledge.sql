-- Applied 2026-07-04 via Supabase MCP (migration: setter_settings_knowledge).

-- Per-user voicemail-drop script (spoken via Telnyx TTS on "Drop VM";
-- falls back to DEFAULT_VM_SCRIPT in lib/telnyx/vm-script.ts).
alter table public.custom_users
  add column if not exists vm_drop_script text;

-- Admin-editable knowledge base shown in the setter/rep portals.
-- Categories are free-form (product / pricing / process / faq ...);
-- body renders as plain text with preserved line breaks.
create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default 'general',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_knowledge_articles_cat
  on public.knowledge_articles(category, sort_order);
