# CloudGreet — Audit Findings

Audit run while you were on break. Honest. No guessing. Each finding has
severity, exact file:line, why it matters in plain words, and a one-line
fix. Sections I couldn't cover from code-reading alone are marked "Not
covered" with the reason.

Severity ladder:
- **P0** — exploitable now, fix before any client onboards
- **P1** — embarrassing or compliance gap, fix this weekend
- **P2** — polish, fine to defer
- **info** — observation, no action needed

---

## P0 findings (5)

### 1. STOP-handler webhook doesn't verify Telnyx signatures

**Where**: `app/api/telnyx/sms-webhook/route.ts` — entire file.
**Why**: Anyone can POST `{ data: { event_type: 'message.received', payload: { from: '+15551234567', text: 'STOP' }}}` to this URL and trigger a permanent opt-out for any phone number. An attacker could mass-opt-out our customers from review SMS, killing the feature for paying contractors.
There's a separate `/api/sms/webhook/route.ts` that DOES verify signatures (uses `verifyTelynyxSignature`); the STOP handler at `/api/telnyx/sms-webhook` is the unverified one. Two SMS webhooks in the codebase makes this easy to miss.
**Fix**: Import `verifyTelynyxSignature` from `lib/webhook-verification`, gate the handler on it the same way `/api/sms/webhook` does.

### 2. `/api/internal/compliance/audit` is fully public, leaks audit trail

**Where**: `app/api/internal/compliance/audit/route.ts:7` (GET, no auth).
**Why**: Calling this URL returns the most recent 50 compliance_events. Compliance events contain tenant ids, paths, user identifiers, request bodies (scrubbed but still meaningful). PII + business intelligence about every action across CloudGreet, exposed without auth.
**Fix**: Add `requireAdmin(request)` at the top of the GET, return 401 on failure.

### 3. `/api/internal/stripe/alerts` accepts arbitrary `tenantId`, no auth

**Where**: `app/api/internal/stripe/alerts/route.ts:15` (POST, no auth).
**Why**: Anyone can POST `{ tenantId: <any uuid>, alertType: 'invoice_failed', message: '...', invoiceId: '...' }` and we'll write a billing_alert for that tenant + enqueue dunning steps. An attacker can spam fake "your payment failed" alerts for any business.
**Fix**: Either lock to `requireAdmin`/internal-secret header OR move it under `/api/admin/...` so it inherits admin auth.

### 4. `/api/cron/send-review-requests` runs unauthenticated

**Where**: `app/api/cron/send-review-requests/route.ts:21-22` — comment explicitly says "We don't verify it strictly".
**Why**: Anyone hitting `https://cloudgreet.com/api/cron/send-review-requests` triggers the SMS sender. They can't choose what gets sent (it just drains the queue), but they CAN drain the queue at unlimited frequency, run up Telnyx bills, and trigger spam-like delivery patterns that get our toll-free number flagged by carriers.
**Fix**: Add `CRON_SECRET` check at the top (same pattern as `process-jobs` and `sales-payouts`). Reject if header doesn't match, fail closed if env var missing.

### 5. `/api/cron/health-check` fails open when `CRON_SECRET` unset

**Where**: `app/api/cron/health-check/route.ts:163` — `if (cronSecret && authHeader !== ...)`.
**Why**: If `CRON_SECRET` is unset in env, the check is skipped and the endpoint becomes public. Same pattern was the bug we fixed in Telnyx + Retell webhook verifiers earlier today. Health-check pings every upstream API on every hit (Stripe, Telnyx, Retell, OpenAI, Resend, Redis, Supabase) — public access = unbounded API costs + rate-limit drain.
**Same pattern in**: `app/api/cron/process-jobs/route.ts:27`, `app/api/cron/sales-payouts/route.ts`, `app/api/cron/telnyx-balance/route.ts` — all have the `if (cronSecret && ...)` shape that fails open.
**Fix**: Flip to `if (!cronSecret || authHeader !== \`Bearer ${cronSecret}\`)` — reject when env is missing.

---

## P1 findings (8)

### 6. `NEXT_PUBLIC_RETELL_API_KEY` is a footgun fallback in 11 files

**Where**: `lib/retell-agent-manager.ts:53`, `lib/retell-knowledge-base.ts:11`, `lib/health-check.ts:144`, `app/api/retell/session-token/route.ts:35`, `app/api/retell/outbound/route.ts:44`, `app/api/dashboard/retell/voices/route.ts:31`, `app/api/dashboard/agent-state/route.ts:58`, `app/api/admin/retell/voices/route.ts:31`, `app/api/admin/clients/[id]/extractions/route.ts:84`, `app/api/admin/clients/[id]/retell-agent/route.ts:46`, `app/api/health/route.ts:25`.
**Why**: Every `RETELL_API_KEY || NEXT_PUBLIC_RETELL_API_KEY` line accepts the public-prefixed version as a fallback. Next.js inlines `NEXT_PUBLIC_*` env vars into the **client-side JS bundle** at build time. If anyone (you, a contractor, future-you on a coffee bender) ever sets `NEXT_PUBLIC_RETELL_API_KEY` in Vercel, your Retell key is suddenly visible to every visitor of cloudgreet.com via DevTools → Sources. Permanent footgun even if the env var is currently absent.
**Fix**: Remove every `process.env.NEXT_PUBLIC_RETELL_API_KEY` reference. Force the secret-only `RETELL_API_KEY`. Same audit for any other `NEXT_PUBLIC_*` that wraps a server secret.

### 7. `/api/health/env` is public and reveals integration matrix

**Where**: `app/api/health/env/route.ts` — no auth, returns a per-env-var status object (`present` / `missing` / `invalid`) for every critical/required/optional secret.
**Why**: Tells an attacker exactly which integrations are wired (Stripe, Telnyx, Retell, OpenAI, Resend, Redis, etc.) and which are misconfigured. Useful recon before targeting a specific weak link.
**Fix**: Gate on `requireAdmin`. Same pattern I applied to `/api/debug/whoami`.

### 8. `/api/monitoring/error` is public, no rate limit, free log spam vector

**Where**: `app/api/monitoring/error/route.ts:13`.
**Why**: Anyone can POST arbitrary error payloads. Floods our Vercel logs (cost), pollutes our monitoring (alert fatigue), and the logged payloads can be crafted to look like real internal errors which is confusing. No auth, no rate limit.
**Fix**: Either auth-gate it (it's only called from our own client code, so requireAuth is reasonable) OR add a token/rate-limit check. If kept public, must rate-limit per IP.

### 9. `/api/applications/upload-url` has no rate limit

**Where**: `app/api/applications/upload-url/route.ts:30` (POST).
**Why**: Already verified earlier the route enforces file-type + size caps, so it's not a data-theft vector. But there's no rate limit on URL generation. An attacker can mint thousands of signed upload URLs per second. Each successful upload writes to your Supabase bucket — slow disk fill / cost vector.
**Fix**: Add `moderateRateLimit(request)` from `lib/rate-limiting-redis` (same pattern used in `/api/contact/submit`).

### 10. `/api/applications` (job application form) has no rate limit

**Where**: `app/api/applications/route.ts` (POST).
**Why**: Public form. Slack ping fires on every submission (we send to founder email per the route). No rate limit means free spam vector → fills your inbox + clutters Slack.
**Fix**: Same as #9, `moderateRateLimit`.

### 11. Two parallel SMS webhook routes with different security postures

**Where**: `app/api/telnyx/sms-webhook/route.ts` (no signature) vs `app/api/sms/webhook/route.ts` (signature verified).
**Why**: It's not clear which one Telnyx is actually configured to hit. If Telnyx hits the unsecured one, an attacker can spoof inbound SMS events. If Telnyx hits the secured one, the STOP handler isn't running. Both can't be right; the duplication itself is a hazard.
**Fix**: Pick one canonical route, point Telnyx at it, delete the other. The new `telnyx-health` page already prescribes `/api/telnyx/sms-webhook` — make that the secured one and delete `/api/sms/webhook`.

### 12. Generic `error: error.message` returned from `/api/internal/stripe/alerts`

**Where**: `app/api/internal/stripe/alerts/route.ts:36` (`error: error instanceof Error ? error.message : ...`).
**Why**: Even after the auth fix above, this leaks raw DB / Stripe error strings into the response. Probably internal-only, but if something ever points a public client at it, schema names + table names + column names leak.
**Fix**: Wrap in a generic message; log the detail server-side via `logger.error`.

### 13. `eval('require')('redis')` in lib/cache/redis-cache.ts

**Where**: `lib/cache/redis-cache.ts:12`.
**Why**: This is a webpack workaround pattern (avoids static analysis bundling redis), but `eval('require')` is a code-smell that triggers SAST tools and confuses reviewers. It's not actually evaluating user input, so it's not exploitable — but if someone ever refactors near it without understanding the trick, it could become exploitable.
**Fix**: Replace with `await import('redis')` (dynamic import) or use the Node `module.createRequire` API. Same effect, no `eval`.

---

## P2 findings (6)

### 14. `dangerouslySetInnerHTML` used in layout.tsx + SEOHead.tsx

**Where**: `app/layout.tsx:115`, `app/components/SEOHead.tsx:135,143,171`.
**Why**: Used to inject JSON-LD structured data. Values appear to be hardcoded constants, so not exploitable. But if anyone ever pipes user input through these spots, it becomes XSS. Worth a comment to that effect so future-you knows not to.
**Fix**: Add a `// CONSTANT-ONLY: never inject user input here` comment above each.

### 15. Many cron handlers fail-open if `CRON_SECRET` unset

**Where**: All 4 cron handlers (`process-jobs`, `health-check`, `sales-payouts`, `telnyx-balance`).
**Why**: Same fail-open pattern as #5 — if env var is missing, the auth check is skipped. Already covered as P0 for `health-check` because it has the worst blast radius (touches every upstream API). The others are lower-risk but should follow the same fix.
**Fix**: Flip every cron to fail-closed; require `CRON_SECRET` to be set in prod.

### 16. `/api/sales/accept-invite` builds rep + sends SMS without rate-limit

**Where**: `app/api/sales/accept-invite/route.ts:24+`.
**Why**: Token is one-time so the endpoint isn't trivially abusable, but if an attacker brute-forces tokens (UUID v4, low odds), every successful guess provisions a Telnyx number for them on our dime.
**Fix**: Add `authRateLimit` (5/15min per IP) at the top.

### 17. `/api/cron/send-review-requests` lacks heartbeat row

**Where**: `app/api/cron/send-review-requests/route.ts`.
**Why**: When the cron silently stops firing (Vercel quota change, env-rotation, etc.) we have no signal until a contractor asks why no review SMS went out. The system-health page proxies via "latest review_requests update" timestamp, but that only works if there are queued rows.
**Fix**: Insert a `system_heartbeats` row (`{cron: 'send-review-requests', at: now()}`) at the start of every run. New tiny table, lets `/admin/system-health` show a real "last-fired" timestamp.

### 18. Sales playbook + LAUNCH-WEEKEND.md may drift after Monday

**Where**: `app/sales/playbook/page.tsx`, `LAUNCH-WEEKEND.md`.
**Why**: Both contain assertions that may stop being true after first contractor onboarding (timeframes, default behaviors, edge cases). No auto-update mechanism.
**Fix**: Add a "Last reviewed" date to each. Re-review monthly.

### 19. `lib/scrapers/ohio-mode.ts:16` has a real TODO

**Where**: `lib/scrapers/ohio-mode.ts:16` — `// TODO (next session): add tdlr-style scrapers for OCILB by trade`.
**Why**: Only TODO I found that's a real "we said we'd do this but didn't." Doesn't affect launch — Ohio scraper isn't live yet — but tracks the gap.
**Fix**: Either move to a backlog issue or actually do it post-launch.

---

## Info / observations (4)

### 20. Force-dynamic coverage on user-scoped APIs

I checked: every `route.ts` under `/api/dashboard` and `/api/sales` (52 files total) contains `export const dynamic = 'force-dynamic'`. Combined with the cache-leak fix in `next.config.js` (now `private, no-store, must-revalidate`), this means user-scoped responses are no longer at risk of being served to other users.

### 21. JWT_SECRET is read everywhere consistently

Every JWT verification path goes through `lib/auth-middleware.ts` or `lib/jwt-manager.ts`. No raw `jwt.verify()` calls with hardcoded secrets. No legacy / parallel auth paths I could find.

### 22. SMS opt-out logic is solid

`lib/review-requests.ts` re-checks opt-out at send time (not just at schedule time) — line 297-306 in the cron worker. Catches the case where a customer texts STOP between scheduling and sending. Good defense-in-depth.

### 23. Universal CloudGreet behavior layer composes correctly

`lib/agent-builder/universal-layer.ts` is idempotent (won't double-append if the marker is already in the prompt) and wired into `app/api/admin/agents-due/[closeId]/generate/route.ts:96-100`. New drafts will get the layer appended automatically.

---

## Sections I could NOT audit from code alone

1. **Whether deployed env vars are actually correct.** I can see what the code expects; I can't see what's in your Vercel dashboard. The `/admin/system-health` page handles this — walk it.

2. **Whether the Stripe webhook actually fires correctly on a real purchase.** Code path looks right but unverified end-to-end.

3. **Whether the agent-builder pipeline produces a clean prompt on a real business.** The cost_micro bug was real; what other latent bugs in `buildBusinessContext` / `generateAgentPrompt` only surface on real input?

4. **Whether Cal.com webhook signature verification actually works.** Code looks correct but I haven't watched a real Cal.com webhook hit it.

5. **UI render quality on real-screen-size browsers.** Reading TSX doesn't tell me whether things look broken on a Chromebook or a 27" iMac.

6. **Whether the Retell agent actually behaves as the prompt + universal layer says.** That's a "make a real call and listen" check — only you can do it.

7. **Whether SMS deliverability works given current Telnyx toll-free verification status.** Code is right; carrier filtering is out-of-band.

8. **Database state.** I can't tell whether all migrations have been run, whether there are orphaned rows from earlier testing, or whether row-level security policies are configured properly in Supabase. RLS is a thing I'd specifically want to verify in a paranoid pass — Supabase RLS is what would protect us if the service role key ever leaked.

9. **The exact Slack channel + member IDs.** I trust your config; can't verify it.

10. **Whether the test-phone propagation I just shipped actually works on a real Mark-Ready click.** The code is right; only a real run-through proves it.

---

## Suggested triage order for tomorrow morning

1. **Fix #1, #2, #3, #4, #5** (P0s). All small code changes, ~30 min total.
2. **Fix #6** (`NEXT_PUBLIC_RETELL_API_KEY` removal) — it's repetitive but mechanical, ~20 min.
3. **Fix #7, #8, #11** (admin-gating env diag + monitoring/error + duplicate SMS webhook) — ~15 min.
4. **Add rate limits to #9, #10, #16** — ~10 min, copy-paste pattern from existing routes.
5. **Walk the LAUNCH-WEEKEND.md plan** — that catches the things I couldn't audit (real Cal.com, real test call, real Stripe purchase, real agent voice).

Total code work above: ~75-90 min. Then product walkthrough (the actually-important part) is on top.

---

*Audit run on cloudgreet.com main branch as of commit `d852efe`. Read-only — nothing was modified during the audit.*
