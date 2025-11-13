# CloudGreet Billing & Finance Ops Playbook

This playbook supports the new billing dashboard (`/admin/billing`), Stripe reconciliation workflow, and automated dunning sequence.

## Daily Checklist
1. Open `/admin/billing` → review MRR, booking fees, and alerts.
2. For each alert:
   - `invoice_failed`: click **Retry payment**. Stripe will attempt an immediate charge and mark the billing alert as resolved on success.
   - `payment_action_required`: send the portal link and note the follow-up in the CRM.
   - `threshold_exceeded`: confirm ledger entry accuracy before the end-of-day snapshot.
3. Export CSV snapshot weekly for finance (`Export CSV` button) and upload to the shared financials drive.

## Stripe Reconciliation Flow
1. Stripe sends webhooks → internal `/api/internal/stripe/alerts` records alerts and schedules dunning steps.
2. Usage ledger (`billing_usage_ledger`) captures:
   - `subscription` entries when we invoice fixed fees.
   - `booking_fee` entries for per-appointment charges.
   - `credit_adjustment` entries for refunds or goodwill credits.
3. The reconciliation API compares Stripe invoicing vs ledger totals for the last 30 days and surfaces past-due invoices + alert list in the UI.
4. Finance can trigger `Retry payment` (Stripe API) or `Resend pay link` (email to the customer) directly from the dashboard.

## Dunning Timeline (Invoice Failed)
| Day | Channel | Copy |
| --- | ------- | ----- |
| 0 | Email | Immediate retry confirmation + link to pay portal |
| 1 | SMS | Friendly reminder with balance due |
| 3 | Email | Final reminder before service interruption |

All dunning steps are stored in `billing_dunning_events` for auditability. The operations team can update copy or mark steps as `sent` via the admin tooling (future enhancement).

## Portal Access & Self-Service
- Clicking **Open Stripe portal** from the dashboard spins up a customer portal session using `billingPortal.sessions.create`.
- Use **Resend pay link** when the customer needs the original invoice email resent. Stripe handles delivery.
- If the customer wants card updates, direct them to the portal link. Changes sync immediately to future invoices.

## Incident Response
1. **Stripe outage** → communicate ETA to success team; pause retries until status.green.
2. **Repeated payment failures** (3+ dunning attempts) → escalate to finance lead; consider account suspension.
3. **Ledger mismatch** (>1% variance) → run `billing_usage_ledger` export, trace new entries, and confirm Stripe metadata.
4. Document all actions in the shared incident doc; tag `billing_ops` in Slack with summary + next steps.

## Environment Requirements
- `STRIPE_SECRET_KEY` set in Vercel and local `.env`.
- `APP_URL` (or `NEXT_PUBLIC_APP_URL`) for portal return route.
- Supabase tables migrated via `migrations/CREATE_BILLING_INFRASTRUCTURE.sql`.

Keep this playbook near the runbook for continuity during on-call rotations. Update dunning copy and alert severities as we learn from real customers.*** End Patch

