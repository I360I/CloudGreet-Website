# CloudGreet — Current State

Last cleaned: 2026-04-29. This file replaces all the old `*_AUDIT.md`, `*_REPORT.md`, `*_STATUS.md` etc. (now under `_archive/old-docs/`).

## Business model

- Direct outreach → contractors (HVAC / roofing / painting).
- Manual concierge onboarding: I provision Retell/Vapi + phone numbers for the client.
- Client logs into `/dashboard` to see calls + appointments.
- I use `/admin` to manage all clients.
- Stripe billing: I invoice; clients do **not** self-checkout.
- **No self-serve signup.** Accounts are created by me.

---

## Pages

### Marketing (public)
- `/` — landing
- `/pricing`
- `/contact`
- `/privacy`, `/terms`, `/tcpa-a2p`, `/cookies`

### Auth
- `/login` — client login
- `/admin/login` — admin login

### Client dashboard (`/dashboard`)
- `/dashboard` — main view (see UI note below)
- `/dashboard/billing` — subscription / invoice info

### Admin dashboard (`/admin`)
- `/admin/clients` — list of all clients (drill-in via `[id]`)
- `/admin/billing` — billing reconciliation
- `/admin/analytics/usage`
- `/admin/health`
- `/admin/knowledge`
- `/admin/phone-inventory`
- `/admin/settings`
- `/admin/test-call`

---

## API routes (67 total)

### Auth (`/api/auth/*`)
`register`, `register-simple`, `login-simple`, `get-token`, `set-token`, `clear-token`

### Client dashboard data (`/api/dashboard/*`)
`data`, `metrics`, `real-metrics`, `real-charts`, `roi-metrics`, `calendar`, `week-calendar`, `business-config`

### Calls & appointments
- `/api/calls/history`, `/api/calls/recording`, `/api/calls/process-recoveries`
- `/api/appointments/create`, `/api/appointments/[id]`

### Business config
- `/api/business/hours`, `/api/business/profile`
- `/api/businesses/update`

### Voice / phone webhooks
- `/api/retell/voice-webhook`, `/api/retell/outbound`, `/api/retell/session-token`
- `/api/telnyx/voice-webhook`, `/api/telnyx/initiate-call`
- `/api/sms/send`, `/api/sms/webhook`

### Stripe / billing
- `/api/stripe/webhook`
- `/api/client/billing`
- `/api/admin/billing/portal`, `/api/admin/billing/reconciliation`, `/api/admin/billing/reconciliation/export`

### Admin (`/api/admin/*`)
`clients`, `clients/[id]`, `ai-settings`, `analytics/usage`, `analytics/usage/export`, `employees`, `health`, `health/history`, `integrations`, `knowledge`, `knowledge/[id]`, `message-client`, `phone-numbers`, `phone-numbers/buy`, `test-call`

### Misc
- `/api/health`, `/api/health/env`
- `/api/cron/health-check`, `/api/cron/process-jobs`
- `/api/contact/submit`
- `/api/notifications`, `/api/notifications/list`
- `/api/calendar/callback`
- `/api/user/gdpr/export`, `/api/user/gdpr/delete`
- `/api/monitoring/error`
- `/api/pricing/rules`
- `/api/progress/confirm`
- `/api/client/test-call`
- `/api/internal/compliance/audit`, `/api/internal/outreach-runner`, `/api/internal/prospecting-sync`, `/api/internal/stripe/alerts`

---

## Dashboards — what's actually rendered today

### Client dashboard (`/dashboard/page.tsx`)
Currently a **70/30 split**:
- **Left (70%)**: `DashboardHero` (hero/greeting) → `RealAnalytics` (KPIs) → `RealCharts`
- **Right (30%)**: `ControlCenter` (calendar + appointments)

> ⚠️ **This is not yet calls + appointments side-by-side.** It's analytics + calendar. Restructuring to a true calls-list-on-left / appointments-on-right layout is pending.

Modals: `CreateAppointmentModal`, `EditAppointmentModal`, `AppointmentDetailsModal`, `FullCalendarModal`, `DayDetailsSidebar`.

### Admin dashboard (`/admin/clients/page.tsx`)
Lists all clients. Click-through to `/admin/clients/[id]` (data, config, calls, appointments per client). Sibling pages handle billing, analytics, health, knowledge, phone inventory, settings, test-call.

---

## What was deleted / archived (2026-04-29)

**Deleted outright** (not archived; restore from original zip if needed):
- Self-serve flow: `app/onboarding`, `app/register-simple`, `app/start`, `app/api/onboarding`, `app/api/phone/provision`
- Employee dashboard: `app/employee`, `app/api/employee`
- Test/demo: `app/demo`, `app/test-agent-simple`, `app/test-styling`, `app/test-jsx.tsx`, `app/api/test`, `app/api/test-tenant-isolation`
- Misc app pages: `account`, `notifications`, `help`, `status`, `features`, `landing`
- Apollo / outreach / lead enrichment admin: `outreach`, `leads`, `customer-success`, `prospecting`, `code-analyzer`, `manual-tests`, `qa-reviews`, `verify-mvp`, `audit-logs` (both `/admin/*` and `/api/admin/*`)
- Tests: `__tests__/`, `e2e/`, `tests/`, `jest.config.js`, `jest.setup.js`, `test-minimal-build.js`, `test-voice-system.js`
- Junk: `pages_backup/`, `commitlint.config.js`, `deploy-now.bat`, `etup-env.js`, `lighthouse-report.json`, a corrupt-named file

**Archived** under `_archive/`:
- `old-docs/` — 193 root markdown files + root reports
- `old-docs-folder/docs/` — old `docs/` folder
- `old-scripts/scripts/` — entire 176-script folder
- `old-sql/` — all root `*.sql` except `COMPLETE_SUPABASE_SCHEMA_FINAL.sql` and `RLS_POLICIES.sql`; plus the old `migrations/` folder

---

## Build status

`npm run build` compiles successfully. One non-blocking page-data-collection error on `/api/admin/integrations` from missing Supabase env vars at build time — not caused by deletions, will resolve when `.env.local` is populated.

## Open items

1. **Dashboard layout** — switch right column from calendar to a calls list so it's truly calls + appointments side-by-side. (Or keep the calendar and add a calls panel; user decision.)
2. Several legacy routes (`auth/login-simple`, `auth/register-simple`, `internal/outreach-runner`, `internal/prospecting-sync`) are still wired up but inconsistent with the no-self-serve / no-outreach direction. Candidates for next cleanup pass.
3. `hooks/` at repo root and `app/hooks/` both exist — possible duplication.
