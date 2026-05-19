# CloudGreet — Launch State

**Generated:** 2026-05-11 (eve of sales-team launch)
**Purpose:** Durable reference for every feature, file, env var, integration, and known risk. Compiled from a 6-agent parallel audit of the codebase.

---

## TABLE OF CONTENTS

1. [Executive Snapshot](#1-executive-snapshot)
2. [Architecture Overview](#2-architecture-overview)
3. [Voice / Retell Pipeline](#3-voice--retell-pipeline)
4. [Onboarding & Forwarding](#4-onboarding--forwarding)
5. [Sales Rep Workflow](#5-sales-rep-workflow)
6. [Admin Workshop](#6-admin-workshop)
7. [Client Dashboard](#7-client-dashboard)
8. [Review Requests System](#8-review-requests-system)
9. [Third-Party Integrations](#9-third-party-integrations)
10. [Cron Jobs](#10-cron-jobs)
11. [Environment Variables](#11-environment-variables)
12. [Database Schema](#12-database-schema)
13. [Auth, Roles, Multi-Tenancy](#13-auth-roles-multi-tenancy)
14. [Webhook Signing Posture](#14-webhook-signing-posture)
15. [Recent Fixes (Last 30 Days)](#15-recent-fixes-last-30-days)
16. [Known Risks & Pre-Launch Checklist](#16-known-risks--pre-launch-checklist)
17. [Open Questions / Post-Launch Priorities](#17-open-questions--post-launch-priorities)

---

## 1. EXECUTIVE SNAPSHOT

CloudGreet is a Next.js + Supabase + Retell SaaS for service contractors. AI receptionist answers missed calls, books jobs into Cal.com, sends review SMS afterward. Sales reps prospect leads, send booking/payment links, get 50% commission via Stripe Connect.

### Status by surface

| Surface | State | Confidence |
|---|---|---|
| Inbound voice → AI book → Cal.com sync | **Working** with honest-failure pattern | High |
| Dialer (rep WebRTC outbound) | **Working** after `unmuteAudio()` fix | High |
| Onboarding wizard (Calcom → Forward → Verify → Done) | **Working** with Retell list-calls fallback | High |
| Forwarding instructions persistent post-setup | **Working** (new Settings section) | High |
| Sales rep workflow (lead → call → book → pay → live) | **Working** | High |
| Admin agents-due queue + workspace | **Working** (manual Retell agent creation) | Medium |
| Review SMS pipeline (AI + manual + Cal.com webhook) | **Wired all 3 paths**, hourly cron | High |
| Stripe payments (checkout + subscription + commission) | **Working**, idempotency-safe | High |
| Multi-tenancy (JWT businessId + agent_id resolution) | **Strong** at API layer; RLS bypassed via service role | Medium |
| Webhook signing | Cal.com hard / Stripe hard / Telnyx hard / **Retell soft** | Medium |

### Biggest pre-launch concerns

1. **Env vars in Vercel** — verify before reps dial: `CRON_SECRET`, `TELNYX_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`, `RETELL_API_KEY`, `RESEND_API_KEY`, `FOUNDER_EMAIL`, `CLOUDGREET_NOTIFICATIONS_FROM`, `INTERNAL_API_TOKEN`, `ANTHROPIC_API_KEY`.
2. **Subscription gate bypass** — `forwarding_verified_at` alone advances onboarding step machine to `done`; only `setTimeout(onVerified)` is paid-gated. A motivated contractor could navigate themselves to live without paying. Fix: require `onboarding_completed` OR `(verified && paid)` in `app/dashboard/onboarding/page.tsx:56-59`.
3. **Cal.com API keys plaintext in DB** — `businesses.cal_com_api_key`. Post-launch priority.
4. **Retell webhook soft-verify** — soft-allows mismatched signatures; agent_id resolution is the actual tenant gate. Set `STRICT_RETELL_SIGNATURES=1` if your workspace key matches.

---

## 2. ARCHITECTURE OVERVIEW

```
        ┌──────────────┐         ┌──────────────┐
PSTN → │   Retell AI   │ ←──→ │   CloudGreet │ ←─ Supabase Postgres
        │  (voice agent)│  webhooks  │   Next.js    │
        └──────────────┘         └──────────────┘
                                            ↑↓
                              ┌─────────┬─────────┬─────────┐
                          Cal.com    Telnyx     Stripe   Resend
                          (calendar) (SMS+SIP) (billing) (email)
```

- **Hosting:** Vercel (Hobby tier → likely Pro for cron cadence).
- **DB:** Supabase Postgres; app uses `supabaseAdmin` (service role) everywhere — RLS bypassed; multi-tenancy enforced in API layer.
- **Auth:** JWT (custom, not Supabase Auth) issued by `lib/auth-middleware.ts`, stored in httpOnly cookie + `Authorization: Bearer` header (dual-mode).
- **Webhook conventions:** Per-tenant URL paths (Cal.com), per-tenant secret in DB, agent_id-signed payloads (Retell).

---

## 3. VOICE / RETELL PIPELINE

### Files
- `app/api/retell/voice-webhook/route.ts` (1081 lines) — custom tool handler + call_inbound prep
- `app/api/retell/call-events/route.ts` (185 lines) — call_started / call_ended / call_analyzed
- `app/api/internal/prewarm-slots/route.ts` (131 lines) — separate-invocation prewarm
- `lib/retell-tools.ts` (223 lines) — tool definitions
- `lib/retell-agent-manager.ts` (1321 lines) — agent provisioning, tool wire, prompt
- `lib/slot-cache.ts` (100 lines) — TTL cache on `cloudgreet_system_config`
- `lib/timezones.ts` (87 lines) — US state → IANA TZ
- `lib/calls/resolve-business.ts` (48 lines) — agent_id → business_id chain
- `lib/webhook-verification.ts` (499 lines) — soft-verify + STRICT mode flag

### Inbound call flow

1. **PSTN → Retell → `call_inbound` webhook** (`voice-webhook:126-184`)
2. **Resolve business_id from to_number** via `resolveCallBusinessId(undefined, toNumber)` (`lib/calls/resolve-business.ts`).
3. **Populate dynamic_variables** (caller history: returning_caller, last_service, name) via `lookupCallerHistory()`.
4. **Fire-and-forget prewarm** to `/api/internal/prewarm-slots` — separate serverless invocation gets its own 10s lifetime to write a 7-day slot cache (scope=`week`, TTL 60s) before agent's first `lookup_availability`.
5. Return `dynamic_variables` to Retell.
6. Agent greets and converses.
7. **Tool calls** routed back to `/api/retell/voice-webhook`.
8. **call_ended / call_analyzed** → `/api/retell/call-events` upserts `calls` table with transcript, recording, sentiment, summary, and extracted custom fields (`call_extractions` jsonb).

### Custom tools (all attached automatically by `retell-agent-manager`)

| Tool | Inputs | Side effects | Failure mode |
|---|---|---|---|
| `book_appointment` | name, phone, service, datetime, review_consent | Insert `appointments` → Cal.com sync → contractor SMS → schedule review SMS → invalidate slot cache | **HARD FAIL** on DB or Cal.com error (502 visible to agent — no false-positive "booked it" claim) |
| `lookup_availability` | date, duration | Read scope=`week` cache → live Cal.com on miss → local fallback | Never tells caller "no availability"; synthesizes 3-day fallback if everything down |
| `send_booking_sms` | phone, appt_id | Telnyx SMS with appointment summary | HARD FAIL if appt missing or send fails |
| `transfer_call` | (none) | `cold_transfer` to business `escalation_phone` | Only attached if business has valid E.164 escalation_phone |
| `end_call` | (none) | Retell primitive | Always succeeds |

`speak_during_execution: true` + `speak_after_execution: true` on all custom tools — eliminates the silent-pause-during-tool-call problem (`lib/retell-tools.ts:76-82, 123-125, 147-148`).

### Multi-tenancy resolution chain (`lib/calls/resolve-business.ts:13-47`)

1. `ai_agents.business_id` where `retell_agent_id = ?`
2. `businesses.retell_agent_id = ?`
3. `phone_numbers.business_id` where `phone_number = to_number AND provider='retell'`
4. `businesses.phone_number = to_number`

Tool args (`business_id` in agent's prompt) **explicitly ignored** — agent prompt cannot target wrong tenant.

### Risks
- `INTERNAL_API_TOKEN` unset → prewarm endpoint open to internet.
- Cal.com key expired → agent silently degrades to fallback slots.
- Unresolvable business → call logged + admin notified but returns 200 (`voice-webhook:1054-1075`).
- Tool name aliases in `voice-webhook:192-203` mask misconfigured legacy agents — broad enough that risk is low.

---

## 4. ONBOARDING & FORWARDING

### Files
- `app/dashboard/onboarding/page.tsx` (797 lines) — 4-step wizard
- `app/api/onboarding/state/route.ts` (84 lines) — wizard state
- `app/api/onboarding/calcom/route.ts` (252 lines) — Cal.com connect + webhook register
- `app/api/onboarding/forwarding/route.ts` (169 lines) — POST persist + GET verify-poll
- `app/api/dashboard/phone/route.ts` (44 lines) — Retell number lookup
- `lib/forwarding-codes.ts` (249 lines) — per-carrier *NN star codes
- `app/api/business/profile/route.ts` (87 lines) — returns `forwardingCarrier/LineType/Mode/VerifiedAt`

### Step machine (`onboarding/page.tsx:56-65`)

```js
if (b.onboarding_completed) setStep('done')
else if (b.forwarding_verified_at) setStep('done')    // ⚠ paid-gate bypass risk
else if (b.calcom_connected) setStep('forwarding')
else setStep('calcom')
```

### Step 1 — Cal.com Connect

User pastes API key → server lists event types → user picks → server validates, registers webhook (URL `${APP_URL}/api/webhooks/cal/${businessId}`, fresh 32-byte hex secret stored on `businesses.cal_com_webhook_secret`), derives timezone (state-based, falls back to Cal.com profile, then Chicago).

### Step 2 — Forwarding

- **No Retell number yet (`page.tsx:431-460`):** Calm static copy "Your agent is being built…", no spinner, no panic panel. Polls every 15s, caps at 2 min (`pollExpired` flag).
- **Number ready:** Display number + Copy button → line type → carrier dropdown (filtered) → mode (missed_only / always) → debounced 250ms POST `/api/onboarding/forwarding` → show dial codes (`forwarding-codes.ts`) with `tel:` links + cancel codes.

### Step 3 — Verify

- Captures `since = new Date().toISOString()` at component mount.
- Polls `GET /api/onboarding/forwarding?since=…` every 4s.
- **Dual detection** (`forwarding/route.ts:62-117`):
  1. DB: `calls` table where `business_id = ? AND created_at >= since`
  2. **Retell list-calls fallback** (new): `POST https://api.retellai.com/v2/list-calls` with `agent_id` + `start_timestamp.lower_threshold = sinceMs`. Fixes the 27-checks-stall caused by webhook lag.
- **Subscription gate** (`forwarding/route.ts:124-154`):
  - `verified && paid` → write `forwarding_verified_at` + `onboarding_completed=true`
  - `verified && !paid` → write `forwarding_verified_at` only; UI shows billing card.

### Step 4 — Done

`/dashboard` redirect. Forwarding instructions remain accessible in `/dashboard/settings` via new persistent `ForwardingSection`.

### Risks
- **Subscription gate bypass** — step machine routes to `done` when `forwarding_verified_at` is set, regardless of paid. Only auto-advance is paid-gated. Edit `page.tsx:57` to require `subscription_status IN ('active','trialing')`.
- **Stuck "agent being built"** — if Retell never provisions, no error shown to user; ping support is the only escape hatch.

---

## 5. SALES REP WORKFLOW

### Files
- `app/sales/leads/page.tsx` (722 lines) — leads list, filters, power dial
- `app/sales/leads/[id]/page.tsx` (969 lines) — detail page: call, send booking link, create account, payment link
- `app/sales/_components/Dialer.tsx` (1104 lines) — Telnyx WebRTC with `unmuteAudio()` fix
- `app/api/sales/leads/[id]/send-onboarding/route.ts` (286 lines) — provision + booking link email
- `app/api/sales/leads/[id]/create-account/route.ts` (258 lines) — direct provision (no booking flow)
- `app/api/sales/leads/[id]/payment-link/route.ts` (232 lines) — Stripe checkout from lead
- `app/api/sales/closes/[id]/payment-link/route.ts` (318 lines) — Stripe checkout from close (with idempotency cache)
- `lib/sales/convert-close.ts` (276 lines) — idempotent close → user + business
- `lib/business-sync.ts` (139 lines) — backfill scraped lead data onto business
- `lib/notifications/founder-alert.ts` (83 lines) — Anthony FYI emails

### Full flow

```
LEAD ASSIGNED → REP CALLS (dialer) → SEND BOOKING LINK or CREATE ACCOUNT
   → DEMO → SEND PAYMENT LINK → PROSPECT PAYS → STRIPE WEBHOOK CONVERTS CLOSE
   → ADMIN BUILDS AGENT → CLIENT LIVE
```

### Two account-creation buttons

| Button | Use case | Email | Lead status |
|---|---|---|---|
| **Send booking link** (violet) | Prospect needs the calendar | "Pick a slot on {rep.booking_url}" or pre-scheduled time | `interested` |
| **Create account** (slate) | Already booked/paid outside CG | "Welcome — log in & connect Cal.com" | `converted` |

Both call `convertCloseToClient()` (idempotent — same rep+email = reuse, no dupes). Create-account also backfills `syncBusinessFromLead()` (website, address, timezone).

### Dialer audio (Telnyx WebRTC)

Three-pronged fix for the SDK's auto-mute behavior:
1. Pre-acquire `localStream` via `getUserMedia({audio: { echoCancellation, noiseSuppression, autoGainControl }})` (`Dialer.tsx:354-369`)
2. Pass to `client.newCall({ localStream, remoteElement: remoteAudioRef.current })`
3. Triple-unmute on `active` state: `call.unmuteAudio()` + manual MediaStreamTrack.enabled=true + RTCRtpSender.track.enabled=true, with retries at 500ms / 1.5s / 3s (`Dialer.tsx:191-209, 400-430`).

Hidden `<audio autoPlay playsInline>` element stays mounted (`Dialer.tsx:685`).

### Payment links

- Monthly + setup are rep-negotiated per deal (no advertised default).
- Stripe checkout `mode: 'subscription'`.
- Metadata: `cloudgreet_close_id`, `cloudgreet_rep_id`, `cloudgreet_lead_id`, `cloudgreet_source`.
- **Idempotency** (`closes/[id]/payment-link/route.ts:137-164`): caches `latest_payment_session_*` on the close; returns cached URL unless pricing changed, expired, or `force: true`.
- **Stripe webhook**: `checkout.session.completed` reads `cloudgreet_close_id` → `convertCloseToClient({ markPaid: true })` if not yet converted. `invoice.paid` writes 50% to `commission_ledger`.

### Founder FYI emails (`emailFounderAlert()` calls)

1. Rep sends booking link → "Rep sent booking link: {business}"
2. Rep creates account → "Rep created client account: {business}"
3. Rep sends payment link from lead → inline Resend (not founder-alert function — inconsistency, low priority)
4. Rep sends payment link from close → inline Resend

Destination: `process.env.FOUNDER_EMAIL` (default `anthony@cloudgreet.com`).

---

## 6. ADMIN WORKSHOP

### Files
- `app/admin/agents-due/page.tsx` (284 lines) — build queue list
- `app/admin/agents-due/[closeId]/page.tsx` (801 lines) — workspace
- `app/api/admin/agents-due/route.ts` (174 lines) — queue API
- `app/api/admin/agents-due/[closeId]/route.ts` — workspace data
- `app/api/admin/agents-due/[closeId]/business/route.ts` — patch website
- `app/api/admin/agents-due/[closeId]/chat/route.ts` — streaming chat with Claude
- `app/api/admin/agents-due/[closeId]/submit/route.ts` — mark agent ready

### Queue sort

Closes WHERE `business_id IS NOT NULL AND demo_agent_status NOT IN ('ready','skipped')`. Frontend sort:
1. Status group: pending/building (0) < ready (2) < skipped (3)
2. Within group: `created_at DESC` (newest provisions at top)
3. `ago(iso)` helper shows "5m ago" / "2h ago" / "3d ago"
4. `useCountdown(scheduled_at)` for demo time — color urgency (red <4h, amber <1d)

### Workspace layout

**Left column:**
1. Website card (paste URL → patched to `businesses.website`)
2. Retell agent ID paste → links + auto-wires tools via `general_tools` PATCH (validates agent exists, attaches book/sms/lookup/transfer/end)
3. Agent builder · chat (streaming Claude with web_fetch context for business)
4. One-shot pipeline (collapsible) — original scrape→Claude→validation flow
5. Submit · mark ready — paste test phone, optional notes → status `ready`, Slack pinged, rep notified

**Right sidebar:** prospect / Google rating / Cal.com slug / services / address / demo status.

### Claude Console managed-agent integration

**Not present.** Workspace uses custom Claude-API streaming chat. No `anthropic.beta.agents.create()` or session management. Acceptable for launch — admin manually creates Retell agents in Retell console, pastes ID into workspace.

---

## 7. CLIENT DASHBOARD

### Files
- `app/dashboard/page.tsx` (672 lines) — overview KPIs, charts, recent calls, upcoming appts
- `app/dashboard/calls/page.tsx` (259 lines) — call list + filters + drawer
- `app/dashboard/appointments/page.tsx` (342 lines) — week + month view + create modal
- `app/dashboard/settings/page.tsx` (~2050 lines) — all settings sections
- `app/dashboard/billing/page.tsx` (228 lines) — Stripe portal + subscription state
- `app/dashboard/_components/Shell.tsx` (119 lines) — nav + setup banner
- `app/api/dashboard/overview/route.ts` — KPI data
- `app/api/appointments/create/route.ts` (242 lines) — manual booking (now triggers review SMS)
- `app/api/webhooks/cal/[businessId]/route.ts` (232 lines) — Cal.com inbound (now triggers review SMS)

### Nav structure

Overview · Calls · Appointments · Settings · Billing · Setup (hidden on mobile).

### Settings sections

| Section | DB columns | Syncs to Retell? |
|---|---|---|
| Name | `business_name` | No |
| OwnerName | `users.first_name/last_name/phone` | Yes (phone → transfer_call) |
| Greeting | `greeting_message` | Yes — ground truth pulled from Retell `beginMessage` |
| Voice | `voice_id` | Yes |
| Speed | `voice_speed` | Yes |
| BookingNotifications | `notifications_phone`, `booking_sms_template` | No (server-side SMS) |
| **ForwardingSection** (NEW) | `forwarding_carrier/line_type/mode` | No (UX only) |
| CalendarConnection | `calcom_connected`, `cal_com_*` | n/a |
| ReviewRequests | `review_requests_enabled`, `google_review_url`, `review_sms_template`, `review_send_timing` | Indirect (agent prompted to capture consent) |
| Password | bcrypt `password_hash` | n/a |
| Profile | `business_type`, `phone_number`, `website`, address fields | No |

### Persistent forwarding section (post-onboarding)

- Display mode: current carrier + mode + dial codes + cancel codes + "Change carrier" button.
- Edit mode: line type → carrier → mode → Save (`POST /api/onboarding/forwarding`).
- Reads `retellNumber` from `/api/dashboard/phone`.
- Codes generated from `lib/forwarding-codes.ts`.

### Risks
- LocalStorage businessId leak risk in calls/page.tsx — mitigated by Shell's JWT lookup.
- Static carrier star codes (`forwarding-codes.ts` "verified at research time 2026") — silent breakage if carrier changes.
- Settings sync errors show yellow hint, not blocking — contractors may miss.

---

## 8. REVIEW REQUESTS SYSTEM

### Files
- `lib/review-requests.ts` (529 lines) — scheduling, sending, opt-out, frequency cap
- `app/api/cron/send-review-requests/route.ts` (40 lines) — hourly cron worker
- `app/api/dashboard/review-requests/route.ts` — settings GET/PATCH
- `app/api/dashboard/review-requests/test/route.ts` — manual test SMS

### Pipeline

```
1. Trigger source produces appointment row (with consent flag)
   → calls scheduleReviewRequest()
2. scheduleReviewRequest checks:
   ✓ consent === true
   ✓ business.review_requests_enabled
   ✓ business.google_review_url present
   ✓ customer phone present
   ✓ NOT in review_opt_outs
   ✓ NOT sent to same phone in last 90 days
   → insert review_requests row, status='queued',
     scheduled_for clamped to 9am-7pm local TZ
3. Cron runs HOURLY (0 * * * *)
   → fetch queued WHERE scheduled_for <= now() LIMIT 50
   → render template {first_name}/{business_name}/{review_link}
   → send via Telnyx (CLOUDGREET_NOTIFICATIONS_FROM)
   → mark sent/failed/skipped
4. STOP keyword inbound
   → markPhoneOptedOut() writes review_opt_outs
   → cancels queued rows for that phone
```

### All three trigger paths wired

1. **AI booking** — `app/api/retell/voice-webhook/route.ts:305` (consent captured by agent on call)
2. **Manual create** — `app/api/appointments/create/route.ts:191-211` (`reviewConsent: true`, contractor's global toggle = opt-in)
3. **Cal.com webhook** — `app/api/webhooks/cal/[businessId]/route.ts:180-201` (after `BOOKING_CREATED` upsert; same opt-in logic)

### Cron cadence

**Hourly** (`vercel.json: "0 * * * *"`) — was previously daily, broke "1h after appointment" semantics. Hourly bounds worst-case delay at ~1 hour.

### Constants
- 90-day frequency cap per customer phone
- Quiet hours 9am–7pm local TZ
- Three timing options: `1h_after` / `evening_same_day` / `next_morning`

---

## 9. THIRD-PARTY INTEGRATIONS

### Cal.com

- **Outbound:** Create/cancel bookings, list slots, list event types, validate API key.
- **Inbound webhook:** `/api/webhooks/cal/{businessId}` — HMAC-SHA256 in `x-cal-signature-256`, secret per-business in DB. **Hard-rejects** if no secret on file.
- **Backstop cron:** `calcom-sync` daily at 6 AM UTC reconciles bookings in [-2d, +60d] window.
- **Failure modes:** Invalid API key → tool calls fail; webhook not registered → bookings only mirror via daily cron; event type not shared → agent sees no slots.

### Retell AI

- **Tool webhook:** `/api/retell/voice-webhook` — soft-verify HMAC-SHA256 in `x-retell-signature`. Tenant resolution via signed agent_id.
- **Lifecycle webhook:** `/api/retell/call-events` — same signing posture.
- **Agent provisioning:** `lib/retell-agent-manager.ts` creates LLM + agent + attaches custom tools via `general_tools` PATCH.
- **Soft-allow rationale:** per-agent webhook key ≠ workspace key. `STRICT_RETELL_SIGNATURES=1` flips to hard-reject.

### Telnyx

- **SMS send:** v2 `POST /v2/messages`, requires E.164 from + messaging_profile_id.
- **SMS webhook:** `/api/telnyx/sms-webhook` — captures STOP/UNSUBSCRIBE → `review_opt_outs`.
- **Voice webhook:** `/api/telnyx/voice-webhook` — bridges PSTN to Retell over SIP.
- **Signature:** Ed25519 in `telnyx-signature-ed25519` + 5-min timestamp window. **Fail-closed** if `TELNYX_PUBLIC_KEY` missing in prod.
- **WebRTC dialer:** session token endpoint `/api/sales/dialer/token` — rate-limited (#50 in past tasks).
- **Balance cron:** daily 1pm UTC, alerts founder if < $5.

### Stripe

- **Webhook:** `/api/stripe/webhook` — Stripe SDK `constructEvent()` (proper timestamp + HMAC).
- **Events handled:** `checkout.session.completed`, `customer.subscription.*`, `invoice.paid/payment_succeeded/payment_failed`.
- **Idempotency:** `webhook_events` table (event_id, provider='stripe').
- **Post-payment:** runs `convertCloseToClient({ closeId, stripeCustomerId, markPaid: true })` inline if not yet converted.
- **Commission:** `invoice.paid` writes 50% to `commission_ledger`, deduped by UNIQUE(source_invoice_id, source_type).
- **Payout cron:** Fridays 2pm UTC sweeps unpaid ledger → Stripe transfers to rep Connect accounts.

### Resend

- One-way email (founder alerts, login credentials, booking link emails).
- Silent failure if `RESEND_API_KEY` unset.

### Anthropic

- Used **only in admin agent workshop** for streaming prompt iteration chat. Not customer-facing.
- API key in `ANTHROPIC_API_KEY`. Optional.

### Supabase

- App uses `supabaseAdmin` (service role) everywhere — RLS bypassed.
- Two clients in `lib/supabase.ts`: anon (client-side reads) + admin (server-side everything).

---

## 10. CRON JOBS

| Path | Schedule | Purpose | Auth |
|---|---|---|---|
| `/api/cron/process-jobs` | `0 0 * * *` (daily 00:00 UTC) | Background job queue | `CRON_SECRET` |
| `/api/cron/health-check` | `0 0 * * *` (daily 00:00 UTC) | Integration health probes | `CRON_SECRET` |
| `/api/cron/sales-payouts` | `0 14 * * 5` (Fri 14:00 UTC) | Stripe Connect transfers to reps | `CRON_SECRET` |
| `/api/cron/telnyx-balance` | `0 13 * * *` (daily 13:00 UTC) | Low-balance alert | `CRON_SECRET` |
| `/api/cron/send-review-requests` | **`0 * * * *` (hourly)** | Send queued review SMS | `CRON_SECRET` |
| `/api/cron/calcom-sync` | `0 6 * * *` (daily 06:00 UTC) | Reconcile Cal.com bookings | `CRON_SECRET` |

All require `Authorization: Bearer ${CRON_SECRET}` header (`lib/cron-auth.ts`). Dev mode allows if unset; prod fail-closed.

---

## 11. ENVIRONMENT VARIABLES

### REQUIRED (will break things if missing)

**Database & Auth**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `CRON_SECRET` (cron + admin protection)

**Retell**
- `RETELL_API_KEY` (agent creation + fallback signing secret)
- *(Also accepted: `NEXT_PUBLIC_RETELL_API_KEY` as fallback)*

**Telnyx**
- `TELNYX_API_KEY`
- `TELNYX_SIP_CONNECTION_ID`
- `TELNYX_MESSAGING_PROFILE_ID`
- `TELNYX_PUBLIC_KEY` (Ed25519 webhook verify — fail-closed if missing in prod)
- `CLOUDGREET_NOTIFICATIONS_FROM` (E.164 sender for SMS)
- `TELNYX_TELEPHONY_CREDENTIAL_ID` (dialer WebRTC)
- `TELNYX_OUTBOUND_FROM_NUMBER` (dialer fallback caller ID)

**Stripe**
- `STRIPE_SECRET_KEY` (verify `sk_live_` for prod!)
- `STRIPE_WEBHOOK_SECRET`

**Internal**
- `INTERNAL_API_TOKEN` (prewarm endpoint auth — currently open if unset)
- `NEXT_PUBLIC_APP_URL` (webhook base URL)

### RECOMMENDED

- `RESEND_API_KEY` (without it, all email silent-fails)
- `RESEND_FROM_EMAIL` (default `noreply@cloudgreet.com`)
- `RESEND_REPLY_TO` (default `anthony@cloudgreet.com`)
- `FOUNDER_EMAIL` (default `anthony@cloudgreet.com`)
- `ANTHROPIC_API_KEY` (admin agent workshop chat)
- `RETELL_WEBHOOK_SECRET` (per-agent if available; falls back to `RETELL_API_KEY`)

### OPTIONAL

- `STRICT_RETELL_SIGNATURES=1` (hard-reject invalid Retell signatures; only if secret matches)
- `NEXT_PUBLIC_SUPPORT_PHONE` (default `+1 (737) 937-0084`)
- `SLACK_WEBHOOK_URL` (health-check alerts)
- `SENTRY_DSN` (error reporting)
- `GOOGLE_CLIENT_ID/SECRET` (OAuth)

### Webhook URLs to register in third-party dashboards

| Provider | URL | Where to set |
|---|---|---|
| Retell tool webhook | `https://{domain}/api/retell/voice-webhook` | Retell agent settings |
| Retell call events | `https://{domain}/api/retell/call-events` | Retell agent settings |
| Cal.com (per business) | `https://{domain}/api/webhooks/cal/{businessId}` | Cal.com Integrations → Webhooks (registered programmatically on contractor connect) |
| Telnyx SMS | `https://{domain}/api/telnyx/sms-webhook` | Telnyx Messaging Profile → Inbound webhook |
| Telnyx Voice | `https://{domain}/api/telnyx/voice-webhook` | Telnyx Phone Number → Webhook URL |
| Stripe | `https://{domain}/api/stripe/webhook` | Stripe → Developers → Webhooks |

---

## 12. DATABASE SCHEMA

### Core tables (all scoped by `business_id` or `rep_id`)

| Table | Purpose | Key columns |
|---|---|---|
| `businesses` | Root tenant | id, owner_id, business_name, phone_number, subscription_status, rep_id, monthly_price_cents, setup_fee_cents, timezone, onboarding_step, onboarding_completed, calcom_connected, cal_com_api_key (plaintext), cal_com_webhook_secret (plaintext), retell_agent_id, forwarding_carrier/line_type/mode, forwarding_verified_at, escalation_phone, review_requests_enabled, google_review_url, review_sms_template |
| `custom_users` | Auth (legacy + reps + contractors) | id, email, password_hash (bcrypt), business_id, role ('owner'\|'sales'\|'admin'), is_active |
| `sales_reps` | KYC + commission profile | id (FK custom_users), stripe_connect_account_id, status, booking_url, telnyx_number |
| `leads` | Prospect records | id, business_name, contact_name, phone, email, status, owner_name, website, state, city, zip |
| `lead_assignments` | Rep ↔ lead | lead_id, rep_id, status, disposition, follow_up_at, last_touched_at, touch_count |
| `closes` | Deal pipeline | id, rep_id, business_id (nullable), prospect_*, agreed_monthly_cents, agreed_setup_fee_cents, status, latest_payment_session_* (idempotency), demo_agent_status, demo_scheduled_at |
| `calls` | Inbound call logs | id, business_id, call_id (UNIQUE), retell_call_id, from_number, to_number, transcript, recording_url, call_summary, call_extractions (jsonb), sentiment, duration |
| `appointments` | Booked appts | id, business_id, customer_name/phone/email, start_time, end_time, service_type, estimated_value, address, notes, cal_com_booking_uid, cal_com_booking_id, review_consent, review_consent_captured_at |
| `ai_agents` | Retell agent registry | id, business_id, configuration jsonb |
| `phone_numbers` | Telnyx DIDs | id, business_id, phone_number (UNIQUE), provider ('retell'\|'telnyx'), webhook_url |
| `notifications` | System messages | id, business_id, recipient_type, channel, status |
| `review_requests` | Queued review SMS | id, business_id, appointment_id, customer_phone, customer_name, scheduled_for, status (queued/sent/failed/skipped/canceled), telnyx_message_id, rendered_message, skip_reason |
| `review_opt_outs` | STOP keyword tracking | phone (digits-only), source, opted_out_at |
| `commission_ledger` | Earnings source-of-truth | id, rep_id, business_id, close_id, source_type, source_invoice_id, commission_cents, payout_id (nullable), earned_at — UNIQUE(source_invoice_id, source_type) |
| `payouts` | Friday batch transfers | id, rep_id, amount_cents, stripe_transfer_id (UNIQUE), status, transferred_at |
| `webhook_events` | Idempotency for Stripe/etc | event_id, provider |
| `cloudgreet_system_config` | KV: slot cache, feature flags | key, value |
| `compliance_events` | Impersonation audit | event_type, admin_id, target_user_id, business_id, occurred_at |

### Migrations (all idempotent — `IF NOT EXISTS` patterns)

40 migration files in `sql/`. Backfills of note:
- `backfill-business-timezone.sql` — state → IANA TZ
- `backfill-business-from-lead.sql` — fill website/address/city/state/zip from scraper
- `appointments-add-estimated-value.sql` — adds estimated_value, address, notes, customer_email, duration (fixed booking 500s)

### Indices

Strong: `businesses.owner_id`, `businesses.phone_number`, `calls.business_id`, `calls.call_id`, `calls.from_number`, `appointments.business_id + start_time`, `appointments.calcom_uid`, `commission_ledger.rep_id (partial: payout_id IS NULL)`.

Gaps: No composite `(business_id, created_at DESC)` for calls/leads — may slow lists at scale.

### Secrets stored plaintext (post-launch priority)

- `businesses.cal_com_api_key`
- `businesses.cal_com_webhook_secret`
- `sales_reps.cal_api_key` (legacy)
- `businesses.stripe_customer_id` (low-risk; ref only)

---

## 13. AUTH, ROLES, MULTI-TENANCY

### JWT shape

```
{ userId, email, businessId, role, iat, exp }
```

Signed with `JWT_SECRET`. 24h expiry for users, 1h for admins. Both `Authorization: Bearer` header and `token` httpOnly cookie accepted (dual mode handles login race).

### `requireAuth(request)` returns

```ts
{ success: boolean, userId?, businessId?, role?, error?, impersonatorUserId? }
```

`impersonatorUserId` surfaces when a parallel `impersonator_token` cookie is set (admin impersonating a contractor).

### Role gates

| Role check | Function | Used by |
|---|---|---|
| Admin | `requireAdmin()` | All `/api/admin/*` |
| Sales | `requireAuth()` + `auth.role === 'sales'` | All `/api/sales/*` |
| Owner/client | `requireAuth()` + `auth.role !== 'sales'` | `/api/dashboard/*`, `/api/appointments/*` |
| Employee | `requireEmployee()` | KYC-gated rep ops |

### Impersonation flow

1. Admin hits `/api/admin/clients/[id]/impersonate` → `requireAdmin()`.
2. Server mints new user JWT for business owner, stashes admin's original in `impersonator_token` cookie (8h maxAge).
3. Logs to `compliance_events: admin_impersonate_start`.
4. End via `/api/admin/end-impersonation` → restore admin token, delete impersonator_token, log `admin_impersonate_end`.

### Multi-tenancy posture

**Strong:**
- All authenticated API routes filter `.eq('business_id', auth.businessId)` from JWT.
- Sales rep routes filter by `auth.userId` via `lead_assignments.rep_id` or `closes.rep_id`.
- Retell webhook resolves business via signed agent_id, not tool args.
- Telnyx voice webhook resolves via `phone_numbers.business_id` lookup on `to_number`.
- Cal.com webhook URL is per-business; HMAC verified against per-business secret.

**Weaker:**
- App uses `supabaseAdmin` everywhere → RLS bypassed; database does no enforcement.
- Admin routes accept `params.id` business IDs without re-checking ownership (acceptable since `requireAdmin` first).

### Rate limiting

`lib/rate-limiting-redis.ts` + `lib/rate-limiting.ts` provide `strictRateLimit` (5/15m), `moderateRateLimit` (100/15m), `authRateLimit` (10/15m), `apiRateLimit` (60/m).

**Covered:** `/api/auth/*`, `/api/appointments/create`, `/api/client/test-call`, `/api/contact/submit`, some `/api/dashboard/*`.

**Gap:** `/api/sales/*` and `/api/admin/*` are not rate-limited. Post-launch priority.

---

## 14. WEBHOOK SIGNING POSTURE

| Provider | Header | Algorithm | Verification | Tenant gate |
|---|---|---|---|---|
| **Cal.com** | `x-cal-signature-256` | HMAC-SHA256 | **HARD** (rejects if no secret on file) | Per-business URL + secret |
| **Retell** | `x-retell-signature` | HMAC-SHA256 | **SOFT** (logs but allows; STRICT mode opt-in) | Signed agent_id resolves business |
| **Telnyx** | `telnyx-signature-ed25519` + `telnyx-timestamp` | Ed25519 | **HARD** (5-min freshness window; fail-closed if pubkey missing) | Phone number lookup |
| **Stripe** | `stripe-signature` | HMAC-SHA256 (Stripe SDK) | **HARD** | Metadata-based business_id |

Retell soft-allow is intentional — workspace key ≠ per-agent webhook key — but the actual security relies on agent_id signed in the payload being unguessable AND resolving to a tenant. Worst case of forgery: a fake call record. No data leak across tenants.

---

## 15. RECENT FIXES (LAST 30 DAYS)

### Voice / call quality
- **Honest-failure pattern** — `book_appointment` HARD FAILS on Cal.com sync error (no more "I booked it!" lies)
- **`speak_during_execution` + `speak_after_execution`** on all custom tools — eliminates silent pause during tool calls
- **`transfer_call` cold-transfer** without `cold_transfer_mode` — fixed PSTN routing (was beeping)
- **Tool payload normalization** — handles `tool_call`, `function_call`, and `name+args` shapes
- **Slot cache prewarm** moved to `/api/internal/prewarm-slots` separate-invocation endpoint (Vercel was killing fire-and-forget on call_inbound response)
- **Slot cache scope** always `week`, filtered client-side (fixed key-mismatch cache miss)
- **Timezone autodetect** — `lib/timezones.ts` US state → IANA TZ; replaces hardcoded `America/Chicago`

### Dialer
- **`unmuteAudio()` fix** — three-pronged attack on Telnyx SDK auto-mute (pre-capture localStream + unmuteAudio + track.enabled at 500ms/1.5s/3s)
- **Hidden remote audio element** `<audio autoPlay playsInline>` for remote stream
- **Echo cancellation** + noise suppression + auto gain in `getUserMedia` config

### Onboarding
- **Retell list-calls fallback** in verify endpoint — fixes 27-checks stall when webhooks lag
- **Calm "agent being built" copy** — no panic spinner, no "this is taking longer than usual"
- **Persistent forwarding instructions** in `/dashboard/settings` post-onboarding

### Sales / admin
- **"Create account" button** on rep lead page — direct provision without booking flow
- **Founder FYI emails** on booking link / account creation events
- **Agents-due sort** — pending/building first, newest-created at top within group
- **`ago(iso)` time-since-arrival** indicator on agents-due rows
- **Payment link idempotency** — caches Stripe session URL on close until pricing changes or expires

### Review SMS
- **Hourly cron** (was daily) — `vercel.json: "0 * * * *"`
- **`scheduleReviewRequest()` wired into manual appointment creates** (`appointments/create:191-211`)
- **Wired into Cal.com `BOOKING_CREATED` webhook** (`webhooks/cal/[businessId]:180-201`)

### Schema migrations
- `appointments-add-estimated-value.sql` — added missing columns (was 500-ing on booking)
- `backfill-business-timezone.sql` — state-based TZ backfill
- `backfill-business-from-lead.sql` — website/address/city/state/zip
- `payment-link-idempotency.sql` — cache fields on `closes`

---

## 16. KNOWN RISKS & PRE-LAUNCH CHECKLIST

### MUST verify before reps dial tomorrow

- [ ] **All required env vars set in Vercel** — see §11. Especially: `CRON_SECRET`, `TELNYX_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`, `RETELL_API_KEY`, `RESEND_API_KEY`, `INTERNAL_API_TOKEN`.
- [ ] **Stripe in LIVE mode** — `STRIPE_SECRET_KEY` starts with `sk_live_`, not `sk_test_`.
- [ ] **Retell webhooks registered** — voice-webhook + call-events URLs in each agent's settings.
- [ ] **Demo contractor's phone is in `phone_numbers` table** (provider='retell') OR `businesses.phone_number` matches inbound to_number.
- [ ] **Demo contractor's Cal.com key is fresh and event type valid**.
- [ ] **Demo contractor's timezone is set** (`businesses.timezone` non-null OR `businesses.state` valid for autodetect).
- [ ] **Run `select id, business_name, state, timezone from businesses where timezone is null;`** — backfill any nulls.
- [ ] **Subscription gate**: confirm test contractors are `subscription_status IN ('active', 'trialing')` before they hit verify step. Otherwise they see billing card.
- [ ] **Manual end-to-end dry run**: rep sends booking link → log in → onboard → make test call → verify SMS lands.

### Pre-launch fixes to consider tonight

1. **Subscription gate bypass** (`app/dashboard/onboarding/page.tsx:56-59`) — change to require `onboarding_completed` only (which is paid-gated server-side), not `forwarding_verified_at` alone:
   ```js
   if (b.onboarding_completed) setStep('done')
   else if (b.calcom_connected) setStep('forwarding')
   else setStep('calcom')
   ```

2. **Stuck-agent error state** (`app/dashboard/onboarding/page.tsx`) — after `pollExpired === true`, surface "Email support" CTA more prominently.

### Known broken / weak (acceptable for launch)

- **Cal.com API keys plaintext in DB** — post-launch: vault or pgcrypto.
- **Retell soft-verify webhook signature** — set `STRICT_RETELL_SIGNATURES=1` only if workspace API key matches webhook key.
- **No rate limits on `/api/sales/*` or `/api/admin/*`** — post-launch.
- **No composite `(business_id, created_at DESC)` indices** — may slow lists at 10k+ rows per business.
- **Static carrier star codes** — if carrier changes them, silent breakage. Add a "report broken code" link in settings.
- **RLS bypassed** (supabaseAdmin everywhere) — single API-layer bug = cross-tenant leak. Mitigation: extensive grep test (passed). Post-launch: enable RLS as defense-in-depth.

---

## 17. OPEN QUESTIONS / POST-LAUNCH PRIORITIES

### Open questions

1. Is `subscription_status` actually being synced from Stripe webhooks reliably?
2. Are the per-business Cal.com webhooks succeeding on registration for new clients? (Failure is non-fatal — degrades to 6 AM cron.)
3. Are demo agents being created in Retell before each rep's scheduled demo? (Admin manual step.)
4. What is the Telnyx pre-paid balance? (Cron will alert daily; verify alert email lands.)
5. Is the founder alert email actually arriving (not in spam)?

### Post-launch priorities (in rough order)

1. **Subscription gate fix** in onboarding step machine (above).
2. **Plaintext secret vault** — Cal.com API keys, Stripe customer IDs.
3. **Per-user rate limits** on admin/sales sensitive routes.
4. **Composite indices** on `(business_id, created_at DESC)` for calls/leads.
5. **RLS as defense-in-depth** on key tables.
6. **Idempotency keys on appointment creation** (Retell retry safety — currently could double-book).
7. **Carrier code freshness check** — periodic verify against carrier docs or contractor feedback loop.
8. **Audit log for sensitive admin reads** — currently only impersonation start/end logged.
9. **Composite unique key `(business_id, source_invoice_id, source_type)` on commission_ledger** — current uniqueness assumes Stripe invoice IDs globally unique.
10. **Anthropic managed-agent integration** for the admin workshop (currently custom streaming chat).
11. **Sales rep payment-link emails** through `emailFounderAlert()` helper for consistency.

---

## APPENDIX A — KEY FILE REFERENCE

```
app/api/retell/voice-webhook/route.ts          1081 lines  Custom tool handler
app/api/retell/call-events/route.ts             185 lines  Call lifecycle
app/api/internal/prewarm-slots/route.ts         131 lines  Slot cache prewarm
app/api/onboarding/calcom/route.ts              252 lines  Cal.com connect
app/api/onboarding/forwarding/route.ts          169 lines  Verify + persist
app/api/appointments/create/route.ts            242 lines  Manual booking
app/api/webhooks/cal/[businessId]/route.ts      232 lines  Cal.com inbound
app/api/sales/leads/[id]/send-onboarding/...    286 lines  Booking link flow
app/api/sales/leads/[id]/create-account/...     258 lines  Direct provision
app/api/sales/leads/[id]/payment-link/...       232 lines  Stripe from lead
app/api/sales/closes/[id]/payment-link/...      318 lines  Stripe from close
app/api/cron/send-review-requests/route.ts       40 lines  Hourly cron
app/api/cron/calcom-sync/route.ts                49 lines  Daily reconcile
app/dashboard/onboarding/page.tsx               797 lines  Wizard
app/dashboard/settings/page.tsx               ~2050 lines  All settings
app/sales/leads/[id]/page.tsx                   969 lines  Lead detail
app/sales/_components/Dialer.tsx               1104 lines  WebRTC dialer
app/admin/agents-due/page.tsx                   284 lines  Build queue
app/admin/agents-due/[closeId]/page.tsx         801 lines  Workspace
lib/retell-tools.ts                             223 lines  Tool defs
lib/retell-agent-manager.ts                    1321 lines  Agent provision
lib/review-requests.ts                          529 lines  Review pipeline
lib/forwarding-codes.ts                         249 lines  Carrier *NN codes
lib/timezones.ts                                 87 lines  State → IANA
lib/slot-cache.ts                               100 lines  TTL cache
lib/sales/convert-close.ts                      276 lines  Close → user+biz
lib/business-sync.ts                            139 lines  Lead → biz backfill
lib/notifications/founder-alert.ts               83 lines  Anthony FYI
lib/auth-middleware.ts                          ~150 lines requireAuth/Admin
lib/webhook-verification.ts                     499 lines  Retell/Telnyx/Stripe
lib/cron-auth.ts                                 26 lines  Bearer check
vercel.json                                      28 lines  Cron schedules
```

## APPENDIX B — INVARIANTS / DESIGN PRINCIPLES

1. **Honest failure over graceful fallback** when state is at stake. `book_appointment` HARD FAILS on Cal.com sync rather than claiming a booking that didn't go through.
2. **Tenant resolution from signed identifiers** (agent_id, JWT businessId, webhook URL path), never from client/agent-supplied tool args.
3. **Idempotent migrations** — every `sql/*.sql` uses `IF NOT EXISTS` patterns; safe to re-run on partial schemas.
4. **Idempotent rep flows** — `convertCloseToClient` reuses existing user+business if same rep+email; payment-link caches Stripe session until pricing changes; webhook_events table dedupes Stripe retries; commission_ledger UNIQUE prevents double-credit.
5. **Service-role DB access + API-layer tenant scoping** — RLS bypassed; every API route must `.eq('business_id', auth.businessId)`.
6. **Fire-and-forget side effects** (contractor SMS, slot invalidation, founder alerts) never await — never block voice response.
7. **Per-tenant webhook secrets** (Cal.com) > shared workspace secrets (Retell) — but Retell compensated by signed agent_id.

---

*This document is a point-in-time snapshot. Code is the source of truth — re-run `LAUNCH_STATE.md` audits with the same prompts when state diverges materially.*
