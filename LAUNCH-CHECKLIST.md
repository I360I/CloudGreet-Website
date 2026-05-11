# CloudGreet launch-day checklist

Run through manually before flipping the switch. Tick items as you go.

## P0 — booking path (must work or no product)

- [ ] Call test Retell number, book an appointment via the agent
  - [ ] Row appears in `appointments` table
  - [ ] Cal.com event appears (if connected)
  - [ ] Confirmation SMS arrives at the caller's number
- [ ] Hang up mid-booking. `calls` row has `duration` populated, transcript saved
- [ ] Try to double-book the same slot. Conflict check rejects the second one

## P0 — auth

- [ ] `/forgot-password` with a real account email → email arrives within 30s, link opens reset page, new password works for login
- [ ] Sign up a brand-new account end-to-end. Onboarding lands in dashboard
- [ ] Log out, log back in

## P0 — env vars in Vercel (confirm set)

- [ ] `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- [ ] `SLACK_SUPPORT_WEBHOOK_URL` (or `SLACK_WEBHOOK_URL` fallback)
- [ ] `RETELL_API_KEY`, Cal.com keys, Stripe keys, Supabase service role
- [ ] `NEXT_PUBLIC_APP_URL` = `https://cloudgreet.com`

## P1 — admin

- [ ] `/admin/system-health` — all widgets green, no red banners
- [ ] `/admin/support-requests` — opens, empty state renders
- [ ] Submit a support ticket from a client dashboard
  - [ ] Email lands in inbox
  - [ ] Slack DM fires
  - [ ] Row appears in admin view
- [ ] Notifications bell shows unread count, dropdown opens, links work

## P1 — money path

- [ ] Trigger a test close → payment link generates, Stripe checkout opens, success redirect lands
- [ ] Stripe Connect payouts toggle on a rep account

## P2 — polish

- [ ] Mobile pass: dashboard, onboarding, support modal, agent prompt editor
- [ ] Click every nav link in client dashboard. No 404s, no console errors
- [ ] Impersonate a client from admin → banner shows, actions log to `admin_audit_events`

## Rollback plan

- DB: every migration this session was idempotent + additive (no drops). Safe to leave in place.
- Code: `git revert <sha>` on main auto-deploys to prod.
