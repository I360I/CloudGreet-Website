-- Applied 2026-07-06 via Supabase MCP (migration: rep_sms_line).
--
-- Dedicated SMS sending line per rep. Local rep DIDs can't deliver SMS
-- until a 10DLC campaign exists (see CLAUDE.md "SMS"); toll-free
-- VERIFIED numbers deliver today. is_sms_line rows are texting-only:
-- excluded from the voice caller-ID pool and from the 3-DID eviction
-- cap in lib/telnyx/rep-numbers.ts.
alter table public.sales_rep_phone_numbers
  add column if not exists is_sms_line boolean not null default false;

-- The verified spare toll-free +18885030906 -> setter's SMS line.
-- (Second verified spare +18333956731 is still free for the next rep.)
insert into public.sales_rep_phone_numbers (rep_id, phone_number, phone_id, label, is_active, is_sms_line)
select '2346a0b3-903a-4650-be94-532a60e40512', '+18885030906', '2968612261691655432', 'SMS line (toll-free)', false, true
where not exists (
  select 1 from public.sales_rep_phone_numbers where phone_number = '+18885030906'
);
