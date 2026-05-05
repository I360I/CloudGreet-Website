# CloudGreet — Rep Portal: Full Context

## What CloudGreet is

A SaaS AI receptionist for service businesses (HVAC, plumbing, electrical, roofing, dental, legal, etc.). Customers call the business's number, an AI agent (Retell + GPT) answers, qualifies the caller, captures intent (and optionally books on their Cal.com), and produces a structured summary that lands in the client's dashboard. Pricing is flexible — typically $499/mo + $899 one-time setup, but reps can negotiate any amount.

Stack: Next.js 14 App Router, Supabase (Postgres), Retell AI for voice, Stripe (Connect Express for rep payouts, regular subscriptions for client billing), Resend for email, Cal.com for calendar.

## Two roles besides admin

- **`owner`** — the contractor/business owner who pays for CloudGreet. Logs in at `/login`, lands on `/dashboard`. Has full control over their own agent.
- **`sales`** — commission-only contractor selling CloudGreet on a 50/50 split (50% of every paid invoice — both monthly and setup fees). Logs in at `/login`, lands on `/sales`. Stripe Connect Express receives weekly payouts.

Admin (`anthony@cloudgreet.com`, role=`admin`) sees everything via `/admin`.

---

## Rep flow end-to-end

### 0. Onboarding

1. Admin invites a rep at `/admin/sales` → enters their email → invite token emailed to them via Resend with a `/sales/accept-invite?token=…` link (14-day TTL).
2. Rep accepts → 3-step flow: name + password → contractor agreement (50/50 split, no clawback, weekly Friday auto-payout, 1099-NEC at year-end) → land on `/sales`.
3. Rep clicks the amber **"Bank not connected yet"** banner → walks through Stripe Connect Express onboarding (KYC, SSN, bank account) hosted by Stripe. Returns to `/sales/onboarding/done`.
4. After Stripe verifies (~instant for individuals/US), `sales_reps.stripe_connect_payouts_enabled = true`. Rep can now receive payouts.

### 1. Lead acquisition

Two paths, both auto-promote into the rep's leads list:

- **Scrape** (`/sales/leads/scrape`): Texas licensing databases (TDLR for HVAC + Electrical, TSBPE for Plumbing, TDA for Pest Control). Each scrape is capped at the rep's daily limit (default **200/day** across all jobs; admin can raise per-rep). Results auto-promote into `lead_assignments` for the rep — no manual click. Phones are filled in via Google Places enrichment when configured (`GOOGLE_PLACES_API_KEY` env var). Quality filters drop license-holders that are clearly not contractors (universities, hospitals, big-co employees, gov agencies, individuals with no business). Cross-run dedupe by phone + Google place_id, so re-runs don't surface the same lead twice.
- **CSV import** (`/sales/leads`): paste a CSV with `business_name, contact_name, phone, email, notes` (header row required, `business_name` mandatory). Phone-deduped against existing leads.

A rep can also export their leads as CSV.

### 2. Cold-calling workflow

`/sales/leads` is calling-optimized:

- Big readable company name + contact + monospaced tabular phone (selectable).
- Big black **Call** button (`tel:` link).
- Status pill is a **dropdown** — one click to tag the outcome the moment the call ends. Statuses: New / Called / Voicemail / Interested / Demo set / Proposal / Closed / Dead / DNC. Optimistic update + auto-touch logged.
- Status filter chips at the top with counts.
- Search bar.
- **Voicemail auto-schedules a +2-day follow-up at 9 AM** if no follow-up is already set.

`/sales/leads/[id]` (lead detail) has:

- Contact info card.
- Status pill grid (one tap to change).
- Follow-up scheduler with quick presets (Tmrw 9am / Mon 9am / Next wk).
- Per-lead notes thread (cmd+enter to post).
- 4 primary header buttons:
  - **Call** (black) — `tel:` + auto-touch.
  - **Send booking link** (violet) — provisions client account before payment, see §3.
  - **Send payment link** (green) — Stripe checkout, see §4.
  - **Copy booking link** (white) — copies the rep's Cal.com URL to clipboard.

### 3. Send booking link (pre-payment client provisioning)

Click violet **Send booking link** on lead detail → form: optional **Demo time** datetime picker.

Backend `POST /api/sales/leads/[id]/send-onboarding`:

- Inserts a `closes` row in `pending` status, $0 monthly (price gets set when payment link goes out).
- Calls shared `convertCloseToClient` helper — creates a `custom_users` row + a `businesses` row with `rep_id` stamped + a random temp password.
- Bumps lead status → `interested`, logs a touch.
- Sends a branded HTML email to the prospect via Resend:
  - `CLOUDGREET` mono eyebrow + "Your account is ready." headline.
  - Login table: Sign in / Email / Password.
  - "Pick a 15-minute slot:" + rep's Cal.com URL — OR "Your demo is scheduled for Mon, May 12 at 3:00 PM:" if rep set a time.
  - No salutation, no marketing copy, no AI/product description.
- Returns the email + temp password to the rep so they can copy it manually if Resend fails.

Now the prospect can log into `/login` during the demo and walk through Cal.com setup, agent edits, etc., live with the rep.

### 4. Send payment link (Stripe checkout)

Click green **Send payment link** on lead detail → form: monthly $ + optional setup $.

Backend `POST /api/sales/leads/[id]/payment-link`:

- Creates (or reuses) a `closes` row.
- Generates a Stripe Checkout session in `subscription` mode with custom inline `price_data`.
- If a `business` already exists for this prospect (booking-link path was run first), reuses its `stripe_customer_id` so we don't orphan duplicate Stripe customers.
- Otherwise uses `customer_email` so Stripe creates the customer at checkout.
- Stamps `metadata.cloudgreet_close_id`, `cloudgreet_rep_id`, `cloudgreet_lead_id` on the session and subscription.
- Lead status → `proposal_sent`.
- URL auto-copies to clipboard. Inline form also surfaces email/SMS deep-links so the rep can fire it off without leaving the page.
- No upper price cap (Stripe still enforces $50 minimum).

### 5. Prospect pays → auto-convert chain

`checkout.session.completed` webhook fires. If `metadata.cloudgreet_close_id` is set:

1. Calls `convertCloseToClient({ closeId, stripeCustomerId: customer.id, markPaid: true })`.
2. **Idempotent fold**: if a user with that email already exists AND owns a business with the same `rep_id`, fold this close into the existing business (sets `close.business_id`, advances `close.status`, syncs `monthly_price_cents` from the close's negotiated amount). Never duplicates user/business records.
3. **Brand-new user**: creates user + business + sends them a login email (same HTML format as the booking-link path).
4. The existing subscription bookkeeping path runs as if the business existed all along.

`invoice.payment_succeeded` webhook fires:

- Looks up business by `stripe_customer_id`.
- Splits invoice lines into MRR (recurring) vs. setup_fee (one-off).
- Writes one `commission_ledger` row per bucket at **50%** with `UNIQUE(source_invoice_id, source_type)` so Stripe retries can't double-credit.
- Flips `close.status` from `invoice_sent`/`pending` → `paid`.
- $0 invoices (100%-off coupons, trials) skip the ledger writes (no commission on $0) but still flip the close.

`customer.subscription.created` is a safety net: if `invoice.payment_succeeded` doesn't fire (common for $0 trials), this also flips closes to `paid` when the sub is `active`/`trialing`.

### 6. Live agent editing during/after demo

`/sales/clients` lists every business with `rep_id = me`. Per-row info:
- Monthly $ (pulled from business or fallback to most-recent close), strike-through + amber **trial** pill if subscription is trialing.
- Subscription pill (active/trial/past due/cancelled).
- "Agent live" / "No agent" indicator.
- "Cal connected" indicator if the client OR rep has wired Cal.com.

`/sales/clients/[id]` is the per-client agent editor with three panels:

**1. Voice & greeting**
- Greeting textarea (saved to `businesses.greeting_message`).
- Voice dropdown (live from Retell `/list-voices`).
- Voice speed slider 0.5×–2.0×.
- Save → `PATCH /api/sales/clients/[id]/agent` → updates business + `retellAgentManager.updateBusinessAgent` push to Retell.

**2. Cal.com integration**
- Detects existing connection (`businesses.calcom_connected`) regardless of whether the rep or the client themselves wired it.
- If not connected: paste API key (Cal.com → Settings → Developer → API keys) → "Connect" → if no event_type chosen yet, panel shows a one-tap dropdown of every event type on their account → click one → fully wired (DB stamped, webhook registered on their Cal.com so booking events flow back to us).
- Disconnect button revokes.

**3. Special handling rules** (edge cases — rep-only feature, more depth than client tier)
- Free-text instructions like "When they ask for pricing, say we do all quotes in person and ask for their address." Max 25 rules per business, 500 chars each.
- Saved to `businesses.agent_edge_cases` (jsonb array).
- Triggers `update-retell-llm` PATCH that regenerates `general_prompt` with a fenced "SPECIAL HANDLING" section. Live within seconds.
- Empty state surfaces 5 starter templates (Pricing / Emergency / Out-of-area / Same-day / Asks-for-owner) — one tap to add.
- Voice/greeting saves do NOT touch `general_prompt` — only edge-case edits trigger the prompt push, preserving any hand-tuning the contractor may have done.

### 7. Earnings + payouts

`/sales/earnings`:

- **Owed hero card** (black) — what they're getting paid this Friday.
- 3-stat strip: MRR / Lifetime / Paid out.
- Line chart with 3-tab segmented control: **MRR** (emerald, month-over-month), **Lifetime** (sky, cumulative commission), **Both** (overlay).
- **Customers** panel: every business they signed, monthly $ (strike-through if trialing), since-date + age pill (`4 mo`), commission earned per account, owed-vs-paid status.
- **Taxes · 2026** card: YTD paid + 1099-NEC status (filed/threshold not crossed yet) + button into Stripe Express dashboard for transfer history + tax forms.

**Friday auto-payouts** — Vercel cron at `0 14 * * 5` (Fri 14:00 UTC ≈ 9 AM ET / 6 AM PT) hits `/api/cron/sales-payouts`:

- Sums every `commission_ledger` row with `payout_id IS NULL` per rep.
- Creates a `payouts` row (status=pending), then fires one Stripe Connect transfer per rep with `idempotency_key = payouts.id`.
- Backfills `payout_id` on ledger rows IMMEDIATELY (before flipping payout to `transferred`) so a mid-flight crash can't double-pay.
- Skip rules: rep terminated, no Connect account / payouts not enabled, $0 owed, owed below $1 (rolls over).
- Emails the rep a short summary with the amount + transfer ID.

Admin can also fire the sweep on demand via "Run payouts" on `/admin/sales`.

### 8. 1099-NEC at year-end

Stripe Connect Express auto-files 1099-NEC for any connected account that received ≥$600 in transfers in a calendar year. Stripe generates the form, files with the IRS by Jan 31, and mails/emails it to the contractor. Reps download from their Stripe Express dashboard via the "Open Stripe dashboard" button on `/sales/earnings`.

Admin must enable 1099-NEC issuance once in Stripe Dashboard → Connect → Settings → Tax forms.

---

## Settings, profile, integrations

`/sales/settings`:

- Booking link (Calendly / Cal.com / Google Schedule URL) — surfaces as the "Copy booking link" button on lead detail and gets included in onboarding emails. Validation auto-prepends `https://` if missing.
- Cal.com integration (rep's own Cal.com personal API key — stored as `sales_reps.cal_api_key`). With this set, demos the rep has scheduled appear automatically in the overview's call list (today inline, tomorrow+ in a separate "Upcoming demos" panel). Each cal row is a click-target that opens `app.cal.com/booking/<uid>` in a new tab.

---

## Overview (`/sales`)

Three things only — paper-cream aesthetic, Phosphor icons:

1. **Owed banner** (black hero) — what they're owed, when it pays (next Friday), MRR, link into Earnings.
2. **Call list** — prioritized: overdue follow-ups → today's follow-ups → "hot prospects" (interested/demo/proposal). Cal.com bookings starting today inline above this list. Empty state nudges to leads.
3. **In-flight deals** — only renders when there are pending closes. Small heads-up.

Sidebar: Overview / Leads / Closes / Clients / Earnings. Settings + Sign out at the bottom.

---

## Admin tools relevant to reps

- `/admin/sales` — rep roster, MTD/lifetime/owed totals, "Invite rep", "Review closes", "Run payouts" buttons.
- `/admin/sales/[id]` — per-rep detail. KPIs (MTD / Lifetime / Owed / YTD paid + 1099 threshold / clients). Status (active/paused/terminated). Permissions (per-rep `lead_scrape_limit`).
- `/admin/sales/closes` — review tabs by status. **Convert to client** button on pending closes manually runs `convertCloseToClient` (rare now since the rep self-serve flow handles it; useful for offline payments or recovering stuck records).
- `/admin/clients/[id]` — full client detail. **"Sales rep"** panel with a dropdown of all non-terminated reps to assign/reassign attribution. **"Sync from Stripe"** button at the top right pulls live subscription state when DB drifts.
- `/admin/billing/places` — real GCP Places API spend (BigQuery billing export). Today / MTD / 30d / 90d, post-credit. Per-SKU breakdown.

---

## Schema highlights (Supabase)

- `sales_reps` — per-rep KYC, Stripe Connect, status (active/paused/terminated), `lead_scrape_limit` (default 200), `booking_url`, `cal_api_key`, agreement signed at + version.
- `sales_rep_invites` — one-time tokens, 14-day TTL.
- `closes` — rep-submitted deals. `rep_id, business_id, prospect_*, agreed_monthly_cents, agreed_setup_fee_cents, status` (pending/invoice_sent/paid/cancelled/rejected).
- `commission_ledger` — source of truth for what we owe each rep. `UNIQUE(source_invoice_id, source_type)` prevents double-credit. `payout_id` foreign key to `payouts`.
- `payouts` — one row per Friday batch transfer. Status (pending/transferred/failed/reversed), `stripe_transfer_id` unique.
- `lead_assignments` — composite key `(lead_id, rep_id)`. Workflow columns: `status, disposition, follow_up_at, last_touched_at, touch_count`.
- `lead_notes` — timestamped per-rep, per-lead.
- `businesses` — adds `rep_id, monthly_price_cents, setup_fee_cents, agent_edge_cases` (jsonb).
- `scrape_jobs / scrape_results` — per-job results staging table; auto-promote at end of rep job inserts into `leads` + auto-claims to the rep's `lead_assignments`.

Migrations applied (run in Supabase):
- `sql/sales-reps.sql`
- `sql/sales-invites.sql`
- `sql/sales-lead-workflow.sql`
- `sql/sales-lead-assignments-fk.sql`
- `sql/sales-scrape-limit.sql`
- `sql/sales-rep-price-caps.sql` (cols kept but not enforced)
- `sql/sales-rep-booking-url.sql`
- `sql/sales-rep-cal-api-key.sql`
- `sql/agent-edge-cases.sql`

---

## Env vars needed

- `JWT_SECRET` — auth
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe
- `RETELL_API_KEY` — voice
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `FOUNDER_EMAIL` — email
- `GOOGLE_PLACES_API_KEY` — phone enrichment in scrapers
- `CRON_SECRET` — Vercel cron auth (Friday payouts)
- `GCP_BILLING_PROJECT_ID`, `GCP_BILLING_DATASET`, `GCP_BILLING_SA_JSON` — for the admin Places-spend tracker
- `NEXT_PUBLIC_APP_URL` — base URL (e.g. https://cloudgreet.com)
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_FULL` — for legacy preset pricing on admin checkout-link

---

## What admin still does (reps can't)

- Wire a Retell agent to a brand-new business (admin clicks "Set Retell agent" in `/admin/clients/[id]`).
- Assign a phone number from Retell to an agent.
- Manage knowledge-base entries on Retell directly.
- Configure 1099-NEC issuance in Stripe Connect (one-time setup).

Everything else is rep self-serve.

---

## Client (owner) side touchpoints relevant to rep flow

- `/login` — both reps and clients sign in here. Role on JWT routes them: `sales` → `/sales`, `owner` → `/dashboard`, `admin` → `/admin`.
- `/dashboard` — client (owner) dashboard. They see calls, appointments, agent settings (basic tier: greeting / voice / hours / FAQ), Cal.com integration. They can't see edge cases.
- `/dashboard/billing` — Stripe-hosted subscription management.
- The agent edit base prompt is set by admin/system. Client edits = simple fields. Rep edits = same simple fields + edge cases. No-one but admin edits the raw prompt.
- When a client connects Cal.com on their side via `/api/onboarding/calcom`, the rep's `/sales/clients/[id]` Cal.com panel correctly reflects the connected state (same `businesses.calcom_connected` field).

---

## Status

✅ Shipped end-to-end. Reps can be onboarded today.

Known small things to keep in mind:
- New rep portals look empty until they sign their first close — the chart is flat at $0, the Owed hero shows $0, etc. Intentional.
- Auto-promote during a scrape can take 30–90s for a full job; reps see results streaming in.
- Phone numbers won't fill in on TDLR scrapes if `GOOGLE_PLACES_API_KEY` is missing (rep gets an amber banner pointing this out).
- For test discounted/$0 trial subs, status sometimes lands as `pending` on the business row if the webhook fired before the customer was linked. Admin uses **Sync from Stripe** on `/admin/clients/[id]` to backfill.
