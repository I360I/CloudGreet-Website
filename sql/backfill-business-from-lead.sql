-- Backfill businesses.website + businesses.address from the originating
-- leads row.
--
-- Why this is needed: admin/clients POST inserts a business row without
-- pulling the scraped data from the lead, so every client created from
-- a scraped lead has a null website on businesses.* even though the
-- scraper captured one and saved it on leads.*. That made the admin
-- workshop, /admin/clients/[id], /sales/clients/[id], and the dashboard
-- all show "no website" for prospects we literally have a URL for.
--
-- Idempotent: only updates rows where the business field is currently
-- null/empty AND the lead has a value. Re-running is a no-op.

update public.businesses b
set website = l.website,
    updated_at = now()
from public.leads l
where l.business_id = b.id
  and l.website is not null
  and l.website <> ''
  and (b.website is null or b.website = '');

update public.businesses b
set address = l.address,
    updated_at = now()
from public.leads l
where l.business_id = b.id
  and l.address is not null
  and l.address <> ''
  and (b.address is null or b.address = '');

-- Reload PostgREST cache so any GET that happens right after picks
-- the new values up.
notify pgrst, 'reload schema';
