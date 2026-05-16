-- Admin workshop archive flag.
--
-- Lets the admin tidy the /admin/agents-due queue by archiving closes
-- that are done (or no longer relevant) without losing the close row -
-- the prospect's business, calls, and the close history all stay
-- intact. A second admin action ("Delete") on the archive view drops
-- the close row entirely; it intentionally does NOT cascade to
-- businesses / custom_users / appointments. That's the rep's
-- /admin/clients/[id] delete path, not this one.

alter table closes
  add column if not exists workshop_archived_at timestamptz;

create index if not exists closes_workshop_archived_idx
  on closes (workshop_archived_at)
  where workshop_archived_at is not null;
