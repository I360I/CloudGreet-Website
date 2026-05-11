-- One-time backfill: derive businesses.timezone from businesses.state
-- when timezone is null/empty. Idempotent.
--
-- Multi-zone states resolve to the dominant zone (TX -> Chicago,
-- FL -> New_York, KY -> New_York, etc). Manually correct any specific
-- contractor whose actual location is in the minority zone.

update public.businesses set timezone = 'America/Chicago', updated_at = now()
where (timezone is null or timezone = '') and upper(state) in
  ('AL','AR','IL','IA','KS','LA','MN','MS','MO','ND','NE','OK','SD','TN','TX','WI');

update public.businesses set timezone = 'America/New_York', updated_at = now()
where (timezone is null or timezone = '') and upper(state) in
  ('CT','DE','DC','FL','GA','KY','ME','MD','MA','NH','NJ','NY','NC','OH','PA','RI','SC','VT','VA','WV');

update public.businesses set timezone = 'America/Denver', updated_at = now()
where (timezone is null or timezone = '') and upper(state) in
  ('CO','MT','NM','UT','WY');

update public.businesses set timezone = 'America/Los_Angeles', updated_at = now()
where (timezone is null or timezone = '') and upper(state) in
  ('CA','NV','OR','WA');

update public.businesses set timezone = 'America/Phoenix', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'AZ';

update public.businesses set timezone = 'America/Anchorage', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'AK';

update public.businesses set timezone = 'Pacific/Honolulu', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'HI';

update public.businesses set timezone = 'America/Indiana/Indianapolis', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'IN';

update public.businesses set timezone = 'America/Detroit', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'MI';

update public.businesses set timezone = 'America/Boise', updated_at = now()
where (timezone is null or timezone = '') and upper(state) = 'ID';

-- Force A1 specifically to Central since the bug report identified
-- it was set to New_York. Safe to run for any row; only updates if
-- state is TX, which A1 is.
update public.businesses set timezone = 'America/Chicago', updated_at = now()
where upper(state) = 'TX' and timezone <> 'America/Chicago';

notify pgrst, 'reload schema';
