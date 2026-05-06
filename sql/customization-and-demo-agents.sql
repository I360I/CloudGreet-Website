-- ============================================================
-- Demo agent pipeline + post-close customization form
-- ============================================================
-- Two intertwined flows are added here:
--
-- 1) DEMO AGENT - between booking-link send and the live demo, the
--    admin builds a rough-draft Retell agent for the prospect. The
--    rep needs to surface "your demo number is X" once it's ready.
--    Tracked on closes:
--      demo_scheduled_at      - cal.com slot the rep books on
--      demo_agent_status      - pending → building → ready → skipped
--      demo_agent_test_phone  - the Retell test number admin pastes in
--      demo_agent_built_at    - stamp on submit
--      demo_agent_notes       - admin-side scratchpad
--
-- 2) CUSTOMIZATION FORM - after a close pays, the client fills out
--    the 8-section form so admin can build the production agent.
--    Tracked on businesses:
--      customization                jsonb of all answers
--      customization_status         not_sent → sent → submitted → building → ready → live
--      customization_sent_at        when the rep clicked "Send form"
--      customization_submitted_at   when the client hit submit
--      customization_ready_at       when admin marked the agent ready
--
-- Both schemas are jsonb-leaning so adding fields/sections is code-only.
-- Idempotent.
-- ============================================================

-- closes - demo agent build pipeline
alter table closes
  add column if not exists demo_scheduled_at      timestamptz,
  add column if not exists demo_agent_status      text not null default 'pending'
    check (demo_agent_status in ('pending','building','ready','skipped')),
  add column if not exists demo_agent_test_phone  text,
  add column if not exists demo_agent_built_at    timestamptz,
  add column if not exists demo_agent_notes       text;

create index if not exists closes_demo_agent_status_idx
  on closes (demo_agent_status, demo_scheduled_at);

-- businesses - customization form blob + pipeline
alter table businesses
  add column if not exists customization               jsonb not null default '{}'::jsonb,
  add column if not exists customization_status        text not null default 'not_sent'
    check (customization_status in ('not_sent','sent','submitted','building','ready','live')),
  add column if not exists customization_sent_at       timestamptz,
  add column if not exists customization_submitted_at  timestamptz,
  add column if not exists customization_ready_at      timestamptz;

create index if not exists businesses_customization_status_idx
  on businesses (customization_status);
