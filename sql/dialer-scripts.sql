-- Admin-editable call scripts / battle cards / SMS templates for the
-- dialer cockpit. Sections:
--   opener/discovery/pitch/closing : prose sections shown in order
--   objection                      : collapsible battle cards
--   sms                            : post-call text templates
--     ({{first_name}} / {{business_name}} placeholders filled client-side)
CREATE TABLE IF NOT EXISTS public.dialer_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('opener','discovery','pitch','objection','closing','sms')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dialer_scripts_section ON public.dialer_scripts (section, sort_order);
