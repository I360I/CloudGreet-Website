-- Per-client speech speed for Retell agent.
-- Retell's voice_speed: 0.5 = half speed, 1.0 = normal, 2.0 = double.
-- We store as numeric so the UI slider can map 1:1.

alter table businesses
  add column if not exists voice_speed numeric(3, 2);
