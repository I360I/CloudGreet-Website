-- Backfill businesses.{website, address, city, state, zip_code} from
-- the originating leads row.
--
-- Why this is needed: admin/clients POST inserts a business row without
-- pulling the scraped fields from the lead, so every client created
-- from a scraped lead has null website/address/city/state/zip on
-- businesses.* even though the scraper captured them and saved them
-- on leads.*. That made the dashboard settings form, admin workshop,
-- /admin/clients/[id], /sales/clients/[id], and the contractor's own
-- profile page all show "no website / no address" for prospects we
-- literally have the data for.
--
-- Idempotent: only updates rows where the business field is currently
-- null/empty AND the lead has a value. Re-running is a no-op.
-- Each field updates independently so partial data still helps.

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

update public.businesses b
set city = l.city,
    updated_at = now()
from public.leads l
where l.business_id = b.id
  and l.city is not null
  and l.city <> ''
  and (b.city is null or b.city = '');

update public.businesses b
set state = l.state,
    updated_at = now()
from public.leads l
where l.business_id = b.id
  and l.state is not null
  and l.state <> ''
  and (b.state is null or b.state = '');

update public.businesses b
set zip_code = l.zip,
    updated_at = now()
from public.leads l
where l.business_id = b.id
  and l.zip is not null
  and l.zip <> ''
  and (b.zip_code is null or b.zip_code = '');

-- Reload PostgREST cache so any GET that happens right after picks
-- the new values up.
notify pgrst, 'reload schema';
