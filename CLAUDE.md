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

## SMS (rep follow-up texts)
- rep_messages table + POST /api/sales/dialer/sms (from rep's active DID) +
  inbound app/api/telnyx/rep-sms-webhook (STOP reply → lead flips do_not_call,
  non-negotiable). CAVEAT: rep DIDs need a Telnyx Messaging Profile + A2P 10DLC
  registration or carriers drop the texts — not yet configured; sends fail loudly.

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
- Live end-to-end call test of the extracted engine (floating panel + cockpit).
- Load the owner's real script file into dialer_scripts.
- Telnyx Messaging Profile + 10DLC for rep SMS.
- Apollo coverage rerun on Pro trial → build/skip decision (trial ends ~Jul 18,
  2026; decide by day 13).
- Rotate the Apollo API key (it was pasted in chat) once integration settles.
