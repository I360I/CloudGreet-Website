# CloudGreet Launch Packet

## Product positioning
- **Audience**: Home-services contractors (HVAC, painting, roofing) needing 24/7 receptionist coverage and lead qualification.
- **Core value**: AI answers calls/SMS instantly, books appointments, synchronises with calendars, and surfaces ROI analytics.
- **Differentiators**:
  - AI voice + SMS with compliance guardrails (HELP/STOP flows).
  - Built-in call recovery workflows and appointment analytics.
  - Transparent per-booking fee layered on a flat subscription.

## Pricing & packaging
- **Monthly subscription**: `$${CONFIG.BUSINESS.MONTHLY_COST}` (configured in `lib/config.ts`).
- **Per-booking fee**: `$${CONFIG.BUSINESS.PER_BOOKING_FEE}` per qualified appointment (Stripe invoice item generated automatically).
- **Included usage**: One AI number + unlimited inbound minutes. Additional numbers billed via Telnyx.
- **Upgrade path**: Future add-ons (multi-location routing, CRM sync) flagged in product backlog.

### Pricing page audit
- `app/pricing/page.tsx` updated for dark theme parity with landing.
- CTA buttons wired to `/start` signup flow.
- Compliance copy (“Reply STOP to opt out; HELP for help.”) visible on SMS-related bullet points.

## Pricing page QA
- [ ] `/pricing` hero communicates subscription + per-booking fee
- [ ] CTA buttons link to `/start`
- [ ] Compliance copy includes “Reply STOP to opt out; HELP for help.”
- [ ] Contact routes (support email, demo link) visible above the fold

## Launch communications
### Customer announcement email (send T-0)
```
Subject: Meet CloudGreet – Your AI receptionist is live

Hi {{first_name}},

We just flipped the switch on CloudGreet, the AI receptionist built for home-service pros.
- Answers every call within seconds
- Qualifies leads and books appointments straight to your calendar
- Shows ROI so you know which campaigns pay off

Ready to try it? Start a free onboarding call here: https://cloudgreet.com/start
Need help? Email support@cloudgreet.com or text (888) 555-1234.

Talk soon,
CloudGreet Team
```

### Paid media blurb (for ads / landing hero)
> "Never miss a call again. CloudGreet’s AI receptionist books jobs for HVAC, roofing, and painting contractors—24/7."

### Social teaser (T-24)
> "Tomorrow we launch CloudGreet: the AI receptionist that answers, qualifies, and books your home-service leads while you’re on the job. Join the waitlist → https://cloudgreet.com/start"

## Billing readiness
- Stripe customer + subscription bootstrapped during onboarding (`app/api/onboarding/complete/route.ts`).
- `scripts/monitor-registration.js` verifies checkout link availability (`checkoutUrl` field).
- Customer portal link exposed in dashboard settings (manual QA complete 2025-11-08).
- Required secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SUBSCRIPTION`, `STRIPE_PRICE_PER_BOOKING` (documented in `DEPLOYMENT_CHECKLIST.md`).

## Support / documentation
- `docs/RUNBOOK.md` covers registration/login/health synthetic failures plus existing telephony incidents.
- New sections document outreach runner + sales workspace monitor remediation.
- Help centre stubs (`app/help/page.tsx`) link to privacy/terms.
- Synthetic monitors workflow (`.github/workflows/synthetic-monitors.yml`) now runs:
  - `monitor-registration.js`
  - `monitor-outreach.js`
  - `monitor-sales-dashboard.js`
  All failures map back to the runbook.
- Support contact: `support@cloudgreet.com` default in footer (update `NEXT_PUBLIC_SUPPORT_EMAIL` to override).
- Demo data seeding script `scripts/seed-demo-data.js` creates owner + sales rep credentials for training/support.

## Launch checklist snapshot
- ✅ Registration flow hardened (first/last name, Supabase mirroring).
- ✅ Admin dashboard dark theme matches marketing site.
- ✅ CI green (`npm run test:unit`, `npm run test:integration`).
- ✅ Synthetic monitors (registration, outreach runner, sales workspace) scheduled hourly.
- ✅ Demo tenant seeded (`npm run seed-demo` via `scripts/seed-demo-data.js`).
- ✅ Deployment checklist updated for go/no-go.

## Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Stripe live keys misconfigured | Monitors capture checkout failure; runbook documents secret names. |
| Telnyx inventory empty | Onboarding warns and logs; provision spare numbers weekly. |
| AI agent provisioning delayed | Runbook outlines manual agent creation + escalation path. |
| Synthetic monitors noisy during rollout | Pause workflow via GitHub UI once manual smoke tests succeed; re-enable before GA. |
| Monitor credentials drift (sales workspace) | Re-run demo seed script and update `MONITOR_EMPLOYEE_*` secrets immediately. |

## Rollout plan
1. **T-48h**: Final content review, verify pricing copy with marketing lead. **Owner:** ______________________
2. **T-24h**: Enable Stripe production keys, run synthetic monitors against production domain. **Owner:** ______________________
3. **T-0h**: Deploy from `main`, verify admin pages & synthetic run, announce via marketing campaigns. **Owner:** ______________________
4. **T+24h**: Review Stripe dashboards for first subscription + booking fees; audit Supabase logs for anomalies. **Owner:** ______________________
5. **T+7d**: Evaluate monitor history, adjust cron cadence if needed, collect first customer testimonials. **Owner:** ______________________
