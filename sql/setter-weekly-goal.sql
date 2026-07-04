-- Adjustable weekly demo-booking goal per setter, plus the bonus tier it
-- unlocks (2 demos/week for 4 straight weeks = $50). Admin-editable via
-- PATCH /api/admin/setters/[id]; defaults to 2 for every existing/new
-- setter so nothing breaks if it's never touched.
ALTER TABLE public.custom_users
  ADD COLUMN IF NOT EXISTS weekly_demo_goal INTEGER NOT NULL DEFAULT 2;
