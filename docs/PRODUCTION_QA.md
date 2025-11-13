# Production QA Checklist

Use this checklist immediately after deploying to production. Record the actual results so we have an auditable trail before marketing traffic goes live.

## 1. Synthetic monitor run
- [ ] Set `SYNTHETIC_MONITOR_BASE_URL` GitHub Actions secret to `https://cloudgreet.com`
- [ ] Set `OUTREACH_RUNNER_URL` secret to `https://cloudgreet.com/api/internal/outreach-runner`
- [ ] Set `MONITOR_EMPLOYEE_EMAIL` / `MONITOR_EMPLOYEE_PASSWORD` secrets (demo sales rep)
- [ ] Trigger workflow: **Actions → Synthetic Monitors → Run workflow → main → Run**
- [ ] Capture output (paste below, include Vercel trace IDs)

```
Run at: ______________________
Registration: ______________________
Login: ______________________
Health: ______________________
Outreach runner: ______________________
Sales workspace: ______________________
Notes:
- 
```

- [ ] If workflow fails, follow “Synthetic monitor failures” in `docs/RUNBOOK.md`

## 2. Manual onboarding validation (production)
- [ ] Create a fresh account via `/start` (document email used)
- [ ] Connect Google Calendar → confirm event created
- [ ] Provision Telnyx number (check Supabase `toll_free_numbers` table)
- [ ] Retell agent auto-created (verify in Retell dashboard) or document remediation
- [ ] Stripe checkout link reachable (`checkoutUrl` from onboarding API response)
- [ ] Delete test account/business when finished (SQL or Supabase UI)

```
Test account email: ______________________
Retell agent ID: ______________________
Telnyx number assigned: ______________________
Stripe checkout URL: ______________________
Follow-up actions:
- 
```

## 3. Alert wiring
- [ ] GitHub → Slack notification configured for failed Synthetic Monitors workflow (GitHub App or webhook)
- [ ] PagerDuty rule created (trigger on two consecutive failures)
- [ ] Support email (`support@cloudgreet.com`) monitored by on-call rotation

## Sign-off
- [ ] Engineering lead ______________________
- [ ] Support lead ______________________
- [ ] Marketing lead ______________________
- [ ] Date ______________________
