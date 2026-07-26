# Sales Portal Redesign - "CRM Pro" spec (branch: sales-crm-ios26)

Owner-approved direction (2026-07-25): same *feel* as the client
dashboard's iOS 26 branch (dashboard-ios26), applied to /sales with a
professional CRM treatment. Reference: Figma "CRM UI Kit for SaaS
Dashboards" cover (indigo SaaS-CRM language) + pro CRM patterns
(Attio/Close/Pipedrive). RULES: same pages, same nav order, same demo
flow. Reps must not be confused. No IA changes.

## Tokens (sales-ios.css, scope `.sales-crm`)
- Ground: #F6F6FA (lavender-tinted near-white; iOS-adjacent, CRM-kit hue)
- Cards: #FFFFFF, radius 16-18px, hairline rgba(15,23,42,.07), soft shadow
- Ink: #0F172A / secondary #475569 / muted #94A3B8
- ACCENT (single): iOS blue #007AFF (owner: blue not purple); tint rgba(0,122,255,.10)
  - replaces the gray-900 primary via utility remap like dash-ios.css
- Semantic: green #16A34A(+tint), red #DC2626(+tint), amber #D97706(+tint)
- Dark mode: same token architecture as dash-ios (html[data-sales-theme])
  ground #0B0B10, cards #17171E, fields #23232B. Default LIGHT, localStorage.
- Font: -apple-system SF stack (matches client branch; keeps Apple feel)

## Chrome
- Port from dashboard-ios26: glass sidebar+topbar (blur+saturate),
  sliding indigo nav pill (framer layoutId), viewport-locked frame
  (already on main), theme toggle in footer, press-scale physics.
- Reuse the page-swipe system (exit->push->enter, direction by nav
  order): copy theme.tsx swipe store pattern into app/sales/_components.

## Page-by-page (keep every feature; restyle + de-clutter)
1. Overview: hero stat row like CRM kit - ONE solid-indigo tile (Calls
   today or Pipeline value) + 3 white tiles w/ tinted delta chips;
   rounded-bar activity chart; keep existing data endpoints.
2. Leads (CRM core - "needs work" per owner):
   - toolbar: segmented filters w/ spring thumb + search (iOS style)
   - lead rows -> two-line cards: name+badges / phone+last-note preview,
     status as tinted pill w/ dot, right-aligned next-action time
   - keep dialer hooks, bulk select, statuses identical
3. Prospects (/sales/closes): full-page detail already shipped on main;
   restyle lifecycle pills to tinted chips; timeline feel.
4. Clients: card grid w/ subscription state chips.
5. Earnings: stat tiles + clean ledger table (tabular-nums).
6. Emails/Playbook/Onboarding: token remap only (like Settings got).
## Build order (each step = commit, Vercel preview per push)
1. sales-ios.css tokens + remap + chrome port + swipe system (SalesShell)
2. Leads workspace restyle  3. Overview  4. Closes/Clients/Earnings
5. polish pass from owner screenshots
## Cautions
- LeadsWorkspace is shared with setter fork - only touch /sales side
  (app/_shared/rep-workspace/* is used by BOTH; prefer wrapping/classes
  scoped under .sales-crm so setter stays untouched)
- Dialer engine files: do NOT refactor (audio hacks are load-bearing)
- Design sign-off rule: sales-facing pages need owner screenshot approval
  - satisfied via Vercel preview on this branch before any merge.

## Owner directive 2026-07-25 (screenshot review of Earnings, dark)
FULL RECOMPOSITION approved - not a reskin. "Sharper, cooler, more
professional." Rebuild layouts:
- EARNINGS: compact header (title + next-payout chip inline, kill the
  giant eyebrow+H1 stack). Row 1: solid-indigo Owed tile (white 70%
  caps label, huge tabular number, pays-date pill, subtle diagonal
  texture) + MRR / Lifetime / Paid-out cards w/ tinted delta chips
  (CRM-kit style). Row 2: full-width trend card - proper segmented
  control (spring thumb), rounded-bar chart, NO emoji icons. Row 3:
  commission ledger as a real table: date, client, type chip, net,
  amount right-aligned tabular; hover rows; empty state designed.
- LEADS (CRM core): two-pane or dense-list recomposition; status
  pipeline chips w/ dots; last-touch + next-action columns; bulk bar.
- Fix classes colliding inside indigo surfaces (gray text on indigo).
