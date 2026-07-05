-- Applied 2026-07-05 via Supabase MCP (migration: vm_drop_recording).

-- Personal voicemail-drop RECORDING (preferred over the TTS script in
-- custom_users.vm_drop_script). Uploaded as 16kHz mono WAV from the
-- setter Settings page; played into the call via Telnyx playback_start.
alter table public.custom_users
  add column if not exists vm_drop_audio_url text,
  add column if not exists vm_drop_audio_seconds integer;

-- Public bucket so Telnyx can fetch the audio for playback_start.
insert into storage.buckets (id, name, public)
values ('vm-drops', 'vm-drops', true)
on conflict (id) do nothing;
