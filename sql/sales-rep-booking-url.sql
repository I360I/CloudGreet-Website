-- Per-rep personal booking link (Calendly / Cal.com / Google Schedule
-- / etc.) that the rep pastes into their profile. Surfaced on the
-- lead-detail page as a "Book demo" copy-link button so reps can
-- send a pre-written outreach message with their scheduler URL in
-- one click.
alter table public.sales_reps
  add column if not exists booking_url text;
