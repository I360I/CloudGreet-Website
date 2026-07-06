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
- **WORKING INTERIM (2026-07-06, commit 54ed877): rep SMS sends from a
  toll-free VERIFIED line, not the local DID.** New
  sales_rep_phone_numbers.is_sms_line flag (sql/rep-sms-line.sql, applied);
  the send route prefers the rep's SMS line, falls back to the active DID.
  Setter owns +18885030906 (same messaging profile as the AI numbers);
  live-verified: Telnyx DLR "delivered" to the owner's cell, where the
  local DID got a 40010 10DLC rejection. SMS lines are excluded from the
  voice picker/local-presence pool and from the DID cap/eviction (losing
  one silently kills texting). Spare verified toll-free +18333956731 is
  free for the next rep. Trade-off: texts come from a different number
  than calls — 10DLC registration below remains the proper long-term fix.
- 10DLC/A2P: **NOT actually done — CORRECTED 2026-07-06.** Earlier note
  ("owner confirmed compliant") was wrong, likely confused with the
  toll-free number's Toll-Free Verification (a different, unrelated
  process). Verified live via GET /api/admin/telnyx/10dlc-status: the
  account has exactly ONE messaging profile ("CloudGreet") with no
  campaign linkage, and EVERY number checked — all 7 rep DIDs plus a
  working toll-free reference number — has zero
  /v2/10dlc/phoneNumberCampaign records. There is no 10DLC campaign on
  this account at all. Local-number rep SMS (setter + sales dialer
  DIDs) cannot deliver reliably to US cells until one exists — Telnyx
  DLR confirmed this exact reason live: "The sending number is not
  10DLC-registered but is required to be by the carrier." The toll-free
  number keeps working fine regardless (TFV, not 10DLC, unaffected).
  FIX REQUIRES THE OWNER: Telnyx portal → Messaging → 10DLC → register
  a Brand + Campaign (needs real business EIN/address/sample message
  content/use-case — nothing to safely fill in on his behalf) and
  attach the "CloudGreet" messaging profile to it. Review time ranges
  hours to a few business days depending on campaign type. Nothing
  further to fix in code until that's done — messaging-profile
  attachment (below) is necessary but not sufficient by itself.
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
  line +17379370133 (reassigned from Aiden's idle pool 2026-07-06,
  sql/assign-setter-did.sql) is now owned by **Ed Nievera**
  (0fb9833c-5963-4350-b9cf-77fd854c34c7, ednievera22@gmail.com) — the
  real, active setter hire (created 2026-07-06, the one texting on
  WhatsApp about leads). CORRECTION: earlier same-session notes said
  "Anthony Edwards" (2346a0b3-903a-4650-be94-532a60e40512,
  chenmomoney@gmail.com) owned this number — that account still exists
  (1 assigned lead, 21 old rep_calls rows, likely a test/placeholder
  from earlier setup) but the phone row's rep_id was repointed to Ed
  Nievera at some point after his account was created; all this
  session's SMS/10DLC diagnostic work applies to the same physical
  number regardless, so nothing was wasted. Ed Nievera also has a
  second number, +18885030906 ("SMS line (toll-free)", inactive,
  unexplored — flagged, not yet investigated). Unmatched inbound texts
  log a warn in sms-webhook instead of dropping silently.
- Delivery receipts: message.finalized DLRs stamp rep_messages.status
  (delivered/delivery_failed) + error_detail; SmsThread shows "delivered"
  or a red "Not delivered - {reason}" on outbound bubbles.
- ROOT CAUSE FOUND + FIXED 2026-07-06 (two stacked bugs):
  1. 10DLC campaign registration in Telnyx is assigned to a MESSAGING
     PROFILE, not per-number — a number inherits the campaign only once
     attached to that profile. provisionRepNumber/orderRepNumber never
     set one, so every rep DID sent unregistered SMS — carriers
     silently filtered it while calls + inbound texts worked fine.
  2. The "phone_id" stored for every number (from the /v2/number_orders
     response) is actually an ORDER resource id, NOT the
     /v2/phone_numbers/{id} that PATCH/DELETE need — so the very first
     fix attempt 404'd on all 7 numbers. This also means
     releaseTelnyxNumber (evict-oldest-number-at-3-cap, manual delete)
     had been silently no-op-ing forever: numbers removed from our DB
     were very likely NEVER released at Telnyx and may still be billing.
  Fixed: lib/telnyx/messaging-profile.ts resolvePhoneNumberId() looks up
  the real id by E.164 number (GET filter[phone_number]=...) before any
  PATCH/DELETE; attachToMessagingProfile + releaseTelnyxNumber both
  take the phone NUMBER now, never a stored id. Automatic going forward
  for every new number. Existing numbers: POST
  /api/admin/telnyx/backfill-messaging-profiles (GET = check without
  changing anything) attaches + self-heals each row's stored phone_id
  to the real one; sequential with a stagger (concurrent hit Telnyx's
  rate limit on the first attempt). NOT YET RUN SUCCESSFULLY as of last
  session end — rerun after this fix deploys, then verify the setter's
  test reply shows "delivered" in /setter/messages.
  Open question flagged, not yet investigated: are there orphaned
  numbers still live (and billed) at Telnyx from past evictions/deletes
  that predate this fix? Worth a Telnyx portal number-inventory vs. DB
  reconciliation pass at some point.

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
- **BLOCKING rep SMS delivery: register a real 10DLC Brand + Campaign in
  the Telnyx portal** (see SMS section above — owner-only, needs business
  details). Nothing further to fix in code until this exists; verify after
  with GET /api/admin/telnyx/10dlc-status (numbers[].campaign_id non-null).
- Rotate the Telnyx messaging profile's v1_secret (briefly exposed
  unredacted in a diagnostic response pasted into chat 2026-07-06, now
  fixed) — Telnyx dashboard → Messaging → CloudGreet profile → regenerate
  signing secret; low severity (forges inbound webhooks only, not account
  access) but cheap to rotate.
- Live end-to-end call test of the extracted engine (floating panel + cockpit),
  plus one real inbound test: call Ed's DID once → cell ring/voicemail → queue pin.
  (Inbound SMS to a rep DID is already prod-verified this session — texting
  the setter's line correctly created a thread; only outbound delivery is
  blocked on 10DLC above.)
- Load the owner's real script file into dialer_scripts.
- Apollo coverage rerun on Pro trial → build/skip decision (trial ends ~Jul 18,
  2026; decide by day 13).
- Rotate the Apollo API key (it was pasted in chat) once integration settles.
- Reconcile Telnyx's actual number inventory against our DB — the
  releaseTelnyxNumber bug (fixed 2026-07-06, see SMS section) means past
  evictions/deletes may have left numbers live and billing at Telnyx despite
  being removed from our records; worth a one-time manual check in the portal.
