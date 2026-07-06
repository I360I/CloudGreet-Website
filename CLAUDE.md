# Working conventions for this repo

- Standing authorization: push to `main` (or the active branch) without asking
  for confirmation each time. Commit messages should still follow the normal
  quality bar; just don't pause for a go-ahead before `git push`.
- The `stop-hook-git-check.sh` "Unverified commit" nag (missing GPG signature /
  committer email mismatch) is cosmetic only — ignore it unless it's blocking
  an actual push.
- Design changes to setter/sales-facing pages: render and screenshot (Playwright,
  chromium preinstalled) and get the owner's sign-off BEFORE wiring/pushing.
  He has rejected unreviewed redesigns multiple times; screenshot-gate everything visual.
- Check the repo itself first (public/, sql/, existing components) before assuming
  an external connector or asking the owner for assets — the logos, schema dumps,
  and prior patterns are usually already here.

# Project state (durable facts)

## Roles & surfaces
- `custom_users.role`: user/admin/owner/sales/setter. Setters (cold callers, no
  commission) use `/setter/*`; commissioned reps use `/sales/*`. Rep-tool API
  routes gate on `REP_TOOL_ROLES` (lib/auth-middleware.ts) = sales + setter.
- Setter UI is the "v5 design system": white canvas #F8FAFC, navy #1E3A8A
  headings, brand blue #2563eb, cyan #0891b2 second series, amber #D97706
  reserved for goal/bonus, hairline borders #E3EAF4, Fira Sans everywhere +
  Fira Code for phone numbers only (fonts in app/setter/_components/fonts.ts).
  No purple anywhere on setter surfaces.
- `SetterLeadsWorkspace`/`SetterScraperWorkspace` are deliberate temporary FORKS
  of app/_shared/rep-workspace/* so /sales stays untouched; unify only after the
  owner approves a full /sales redesign.

## Dialer
- The Telnyx WebRTC engine lives in app/sales/_components/dialer-engine.ts
  (useDialerEngine). The audio-path hacks (tryUnmute triple-fire, attachStream
  poller, per-call getUserMedia) encode real Telnyx SDK bugs — never "clean up".
- Two consumers: floating panel (Dialer.tsx, /sales + /setter leads pages) and
  the full-screen cockpit (/setter/dialer, DialerCockpit.tsx). Cockpit sessions
  are handed over via sessionStorage key `cg.dialer.queue`.
- Cockpit hotkeys: 1-7 dispositions, C callback, M mute, K keypad, V drop VM,
  H hang up, N note, Space pause.
- Scripts/battle cards/SMS templates live in the `dialer_scripts` table,
  admin-edited at /admin/scripts. Seeded with placeholder copy — the owner has
  a real script/onboarding file for Ed that still needs to be loaded in.

## Leads & goals
- Lead statuses include `demo_scheduled` (booked) and `demo_showed` (held —
  client actually showed). The weekly goal + $50/4-week-streak bonus counts
  demo_showed ONLY (lib/sales/dialer-stats.ts getWeeklyDemoGoalStatus).
  Per-setter goal target: custom_users.weekly_demo_goal (default 2).

## SMS (rep follow-up texts) — two-way, live
- 10DLC/A2P: DONE — the owner confirmed the account is 10DLC compliant
  (Jul 2026). No delivery caveat anymore.
- Outbound: POST /api/sales/dialer/sms (from rep's active DID) → rep_messages.
- Inbound: the Telnyx Messaging Profile's inbound webhook points at the
  EXISTING /api/telnyx/sms-webhook (signature-verified + deduped). That route
  checks sales_rep_phone_numbers FIRST and hands rep-DID texts to the shared
  handler lib/telnyx/rep-inbound-sms.ts (rep_messages insert, bell notify via
  notifyRep, lead note, STOP reply → lead flips do_not_call, non-negotiable).
  /api/telnyx/rep-sms-webhook still exists as a thin spare over the same
  handler — don't let the two drift.
- Reading: GET /api/sales/dialer/sms (?lead_id thread + mark_read, ?phone=
  thread for numbers that matched no lead, ?inbox=1 per-thread list +
  unread, ?unread_count=1 badge). UI: shared SmsThread.tsx renders in the
  cockpit's Text follow-up card AND the /setter/messages inbox page
  (Messages nav item with amber unread badge, 30s poll in SetterShell).
- Sends REQUIRE the rep's own active DID (409 otherwise) — the old env
  fallback (+15129425428) is gone because replies to a shared number can't
  route back to a rep; that number is unrouted for inbound. The setter
  (Anthony Edwards) owns +17379370133 ('Setter line', reassigned from
  Aiden's idle pool 2026-07-06, sql/assign-setter-did.sql). Unmatched
  inbound texts log a warn in sms-webhook instead of dropping silently.
- Delivery receipts: message.finalized DLRs stamp rep_messages.status
  (delivered/delivery_failed) + error_detail; SmsThread shows "delivered"
  or a red "Not delivered - {reason}" on outbound bubbles.
- ROOT CAUSE FOUND + FIXED 2026-07-06: 10DLC campaign registration in
  Telnyx is assigned to a MESSAGING PROFILE, not per-number — a number
  inherits the campaign only once it's attached to that profile. Every
  rep DID was ordered via /v2/number_orders WITHOUT a messaging_profile_id
  (provisionRepNumber + orderRepNumber never set one), so EVERY rep
  number was sending unregistered — carriers silently filtered outbound
  SMS while calls and inbound texts worked fine (confirmed live: Telnyx
  accepted + "sent", then a delivery_failed DLR citing exactly this).
  Fixed automatically going forward: both provisioning paths now call
  lib/telnyx/messaging-profile.ts attachToMessagingProfile(phoneId)
  right after ordering. Existing numbers need the one-time backfill:
  POST /api/admin/telnyx/backfill-messaging-profiles (GET = check status
  without changing anything) — run this once after deploy for every
  already-provisioned rep DID including the setter line.

## Callbacks & inbound return calls
- Scheduled callbacks resurface: /api/setter/overview pins
  follow_up_at <= now() leads first in up_next (due:true, callbacks_due
  count); Overview shows an amber "N callbacks due" chip; leads workspace
  has a "Callbacks due" filter pill; cockpit live card shows the promised
  time (amber when past due).
- Inbound return calls (rep-voice-webhook): rep lookup no longer requires a
  sales_reps row (setters have none by design) — personal_cell comes from
  sales_reps OR custom_users.personal_cell (admin-edited per setter on
  /admin/setters, "Inbound cell"). No cell = answer + voicemail, never dead
  air. Outcomes log to rep_calls with direction='inbound' (dial stats filter
  to outbound); a missed inbound auto-pins the matching lead
  (follow_up_at=now() + note) so the return call becomes the next dial.
- Prod-verified 2026-07-06 via temp setter + seeded thread (all endpoints
  returned expected values; test rows deleted).

## Apollo.io (in evaluation)
- APOLLO_API_KEY is in Vercel env. api.apollo.io is BLOCKED from the dev
  sandbox network policy — Apollo calls only run in prod or the owner's terminal.
- lib/apollo.ts (orgEnrich/findOwner, search-level = no credit burn) +
  GET /api/admin/apollo-coverage (admin browser probe). Free-tier test showed
  76% company match, people-search was plan-gated; owner started a 14-day Pro
  trial. Pending: rerun coverage, then (if ≥~35-40% owner+email) build the
  enrichment pipeline + Apollo-as-source puller per the session plan.
- Credit discipline: only reveal emails for leads missing one; never re-enrich;
  cap batch sizes.

## SEO / AI answer engines
- public/llms.txt + public/llms-full.txt (keep factual, no invented pricing —
  the site publishes none). Homepage FAQ renders + emits FAQPage JSON-LD from
  the same array. robots.ts explicitly allows the major AI crawlers and
  disallows all private areas incl. /setter/.

## Infra
- Supabase project id: tpuwgxnfovlcxylzzeaw (MCP: apply_migration/execute_sql).
  Migrations applied live AND mirrored as files in sql/.
- Vercel auto-deploys main. Playwright chromium at /opt/pw-browsers.

## Open items
- Live end-to-end call test of the extracted engine (floating panel + cockpit),
  plus one real inbound test: call Ed's DID once → cell ring/voicemail + queue pin.
- One real inbound SMS test (text a rep DID) to confirm the sms-webhook →
  rep-inbound routing on the live Messaging Profile.
- Load the owner's real script file into dialer_scripts.
- Apollo coverage rerun on Pro trial → build/skip decision (trial ends ~Jul 18,
  2026; decide by day 13).
- Rotate the Apollo API key (it was pasted in chat) once integration settles.
