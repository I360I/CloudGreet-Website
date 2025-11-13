# CloudGreet Customer Success Playbook

This playbook operationalises our 0/7/30-day touchpoints so every new tenant reaches full activation and stays engaged. Pair it with the in-app success cockpit (`/admin/customer-success`) for live health data.

## Day 0 – Concierge Onboarding
- **Goal:** Ensure the owner finishes the self-serve onboarding wizard the same day they sign up.
- **Actions:**
  - Trigger welcome email/SMS with login link and a 2-minute loom walkthrough.
  - Confirm calendar connection, number provisioning, and AI prompt tuning are complete.
  - Schedule a 15-minute “go-live calibration” call; run a live test call during the session.

## Day 3 – Activation Check
- **Goal:** Verify automation is live and outbound outreach has started.
- **Actions:**
  - Review success cockpit alerts. If onboarding incomplete >3 days, call the owner and offer white-glove setup.
  - Confirm an outreach sequence is scheduled; adjust throttles if pipeline is cold.
  - Ensure Stripe subscription is active; resend billing link if still in trial.

## Day 7 – First Week QA
- **Goal:** Capture qualitative feedback and correct conversational gaps.
- **Actions:**
  - Pull at least two call recordings into the QA workspace; log highlights + action items.
  - Update knowledge base with any missing offers, policies, or objection handling notes.
  - Deliver a mini health recap (calls handled, outreach touch count, appointments booked) to the client and internally in Slack.

## Day 30 – Value Review & Expansion
- **Goal:** Prove ROI, remove friction, and identify upsell opportunities.
- **Actions:**
  - Export the customer health report and review conversion metrics with the client.
  - Confirm synthetic monitors are green (registration, outreach, sales dashboard).
  - Discuss next automation: additional service lines, employee dashboards, or premium AI tuning.
  - Capture testimonial/NPS once satisfaction score ≥4.

## Escalation Triggers
- **Onboarding incomplete after 3 days:** Escalate to CS lead, schedule screenshare, and complete setup live.
- **No calls in last 7 days:** Verify routing, run test call, and notify GTM owner for follow-up.
- **Outreach idle >7 days:** Audit sequences, deliverability, and Clearbit/Apollo credentials; reset throttles.
- **Subscription inactive/past due:** Engage billing ops immediately; send dunning email/SMS + Stripe customer portal link.

## Source of Truth
- **In-app dashboards:** `/admin/customer-success`, `/admin/knowledge`, `/admin/qa`.
- **Runbooks:** `docs/RUNBOOK.md` (registration, monitors, outreach runner) + this playbook.
- **Alerts:** Synthetic monitors + success cockpit alerts (export weekly).

