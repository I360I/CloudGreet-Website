-- ============================================================
-- Audit cleanup 2026-05-18: lock down create_appointment_safe
-- and tighten storage / view security
-- ============================================================
-- Run in Supabase SQL editor. Idempotent where possible.

-- 1. Drop the stale 12-arg create_appointment_safe overload.
--    Leaves only the 13-arg version with p_is_emergency.
drop function if exists public.create_appointment_safe(
  uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz,
  integer, numeric, text, text
);

-- 2. Lock down the remaining create_appointment_safe:
--    - revoke EXECUTE from anon/authenticated/public
--      (server only uses service-role key, so this won't break the app)
--    - pin search_path to remove the search_path-mutable warning
revoke execute on function public.create_appointment_safe(
  uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz,
  integer, numeric, text, text, boolean
) from public, anon, authenticated;

alter function public.create_appointment_safe(
  uuid, text, text, text, text,
  timestamptz, timestamptz, timestamptz,
  integer, numeric, text, text, boolean
) set search_path = public, pg_catalog, extensions;

-- 3. Storage bucket hardening: cap upload size + restrict MIME types
--    for the `applications` bucket (rep résumés + intro videos).
update storage.buckets
   set file_size_limit = 104857600,   -- 100 MB
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'image/jpeg', 'image/png',
         'video/mp4', 'video/quicktime', 'video/webm'
       ]
 where id = 'applications';

-- 4. Convert rep_decay_inputs view to SECURITY INVOKER so it doesn't
--    run with creator privileges. Adjust if you actually need DEFINER.
alter view if exists public.rep_decay_inputs set (security_invoker = true);

-- 5. Drop the vestigial singular column `notification_phone` on businesses.
--    Schema has BOTH `notification_phone` (unused) and `notifications_phone`
--    (used by the app). Drop only if no other tool writes to the singular one.
--    SAFE-CHECK first; uncomment to drop:
-- alter table public.businesses drop column if exists notification_phone;
