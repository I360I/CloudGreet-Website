# CloudGreet - Current State

Last updated: 2026-05-01. Replaces all prior `*_AUDIT.md`, `*_REPORT.md`, `*_STATUS.md` (archived under `_archive/old-docs/`).

---

## Branches

| Branch | What's there | Where it deploys |
|---|---|---|
| `main` | Public marketing site as of last push (light theme, Cal.com booking, ROI calc, real logo) | **cloudgreet.com** |
| `dashboard-rebuild` | Everything from main + new admin shell + Retell webhooks + dashboard work in progress | `cloud-greet-website-git-dashboard-rebuild-i360is-projects.vercel.app` |

`dashboard-rebuild` is **ahead of main**. Don't merge yet - customer dashboard isn't built.

---

## What works today (verified end-to-end)

### Public marketing site (on main + preview)
- `/` - light cream theme landing: hero, product card with phone-call transcript, platforms strip, stats, ROI calculator (3 sliders + typeable job-value), final CTA, footer card
- `/contact` - Cal.com inline embed (`cal.com/cloudgreet`) handles booking + calendar sync + confirmation emails
- `/login` - light-theme client login
- Real CloudGreet black logo wired in nav + footer
- Sky-blue accents, Helvetica Neue, no gradients

### Admin (only on `dashboard-rebuild`)
- `/admin/login` - light theme, only allows `is_admin = true` users
- `/admin` - clients table + "New client" form
- `POST /api/admin/clients` - creates `custom_users` (owner) + `businesses` + optional `phone_numbers` row, properly handles the `owner_id` chicken-and-egg, rolls back on failure
- `GET /api/admin/clients` - simple list of all businesses
- Admin login: `aedwards4242@gmail.com` / `Anthonyis42!` (password hash generated via Postgres `crypt()` to avoid copy-paste mangling)

### Retell ingestion (only on `dashboard-rebuild`)
- `POST /api/retell/call-events` - handles `call_started` / `call_ended` / `call_analyzed` Retell events
- Resolves `business_id` by `retell_agent_id` first, falls back to `to_number → phone_numbers.phone_number`
- Upserts into `calls` table by `retell_call_id`. Captures: duration, transcript, recording_url, sentiment, summary, full call_analysis JSON
- Signature verification with `RETELL_WEBHOOK_SECRET` (falls through if unset)

---

## What's still missing / next phase

### Phase 5: Customer dashboard (next session)
The `/dashboard` route currently shows the OLD analytics+calendar view. Needs rebuild:
- 4 KPI cards: Total calls / Calls today / Avg duration / Booked rate
- Two-column: Recent Calls list (click → transcript drawer + audio player) | Upcoming Appointments
- Charts: daily volume line (30d), outcomes donut, duration histogram (Recharts)
- Light theme matching landing
- Multi-tenant isolation: queries filter by `business_id` from JWT

### Phase 6: Voice webhook update
`/api/retell/voice-webhook` (handles in-call `book_appointment`) currently requires `business_id` as a tool arg. Update it to look up `business_id` from `to_number` like call-events does, so Retell agent config doesn't embed a UUID.

### Phase 7: Real call test
After Phase 5+6: configure a Retell agent, point its webhook at `/api/retell/call-events`, make a test call, verify the row lands in `calls` and shows on the dashboard.

### Phase 8: Multi-tenant isolation test
Create two test clients via admin, log in as each, verify each only sees their own data.

### Phase 9: Polish
Subtle framer-motion enter animations, loading skeletons, number tickers on KPIs.

---

## Open issues / known bugs

1. **Old `/api/admin/integrations`** still 500s during build collect-page-data because of Supabase init. Pre-existing, doesn't affect runtime, ignore.
2. **`anthony@cloudgreet.com`** still exists as a second admin row from old build. Harmless. Delete with `DELETE FROM custom_users WHERE email = 'anthony@cloudgreet.com';` if desired.
3. **Old admin sub-pages** (`/admin/clients/[id]/page.tsx`, `/admin/billing`, etc.) are still on the dark theme. They'll work but look out of place. Will rebuild during Phase 5/6.
4. **Vercel deploys** - only `cloud-greet-website` remains. The two failing duplicates (`cloudgreet-premium`, `new-folder`) were deleted.

---

## Database (Supabase) - current state

After today's cleanup:
- `custom_users` - wiped of ~3,000 synthetic test rows. Currently 2 rows: `aedwards4242@gmail.com` (admin), `anthony@cloudgreet.com` (legacy admin).
- `businesses` - TRUNCATEd CASCADE. 0 rows.
- `calls`, `appointments`, `phone_numbers` - empty (cascaded).
- Schema unchanged except: dropped FK `businesses_owner_id_fkey` (pointed at wrong table).

Auth: `custom_users.id` is user identity. `businesses.owner_id` references custom_users (no enforced FK now). JWT carries `{ userId, businessId, email, role }`.

---

## Vercel env vars

Critical 4 are set:
- `NEXT_PUBLIC_SUPABASE_URL` ✓
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓ (legacy key - keep using legacy until we migrate)
- `JWT_SECRET` ✓

Missing/optional:
- `RETELL_WEBHOOK_SECRET` - not set; webhook accepts events without signature verification (warning logged). Set before going live with paying clients.
- `RESEND_API_KEY` - for outbound email. Cal.com handles demo confirmations directly, so this is optional unless we want admin-side notifications.

---

## Per-client Retell setup checklist (when onboarding a contractor)

1. Create Retell agent (voice + prompt)
2. Buy/assign Retell phone number to that agent
3. Set agent **webhook URL** to `https://cloudgreet.com/api/retell/call-events` (or preview URL while testing on `dashboard-rebuild`). Enable `call_started`, `call_ended`, `call_analyzed`.
4. Add custom function `book_appointment` → URL `https://cloudgreet.com/api/retell/voice-webhook`, params: `name`, `phone`, `service`, `datetime`. (Once Phase 6 lands, no `business_id` param needed.)
5. In CloudGreet `/admin` → New client → fill business info + paste Retell **agent ID** + **phone number** (E.164 format).

Contractor forwards their existing business line to the Retell number.

---

## Login credentials

- **Admin**: `aedwards4242@gmail.com` / `Anthonyis42!` → `/admin/login`
- **Demo Retell number** (sounds like a CloudGreet receptionist): `+1 (737) 937-0084`
- **Cal.com booking**: `cal.com/cloudgreet`

---

## File counts (sanity)

- 172 TypeScript files in `app/`
- 68 API routes
- 20 pages

## Old branches to delete

- `redesign-clean-light` - already merged
- `fix-pricing-and-dashboard` - already merged
