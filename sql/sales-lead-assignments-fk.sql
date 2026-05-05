-- The original sales-reps.sql declared lead_assignments.lead_id as
-- `uuid not null` with no foreign-key reference to public.leads(id).
-- That breaks PostgREST's auto-join syntax (`leads:lead_id(*)`),
-- which is what the rep dashboard's leads list / overview / export
-- endpoints all use to fetch lead bodies alongside their workflow
-- state.
--
-- Adds the missing FK in a way that's safe to run on existing data:
-- if any lead_assignments row points at a deleted lead, drop those
-- orphaned rows first so the constraint can apply.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lead_assignments_lead_id_fkey'
  ) then
    -- Clean up orphans (assignments referencing deleted leads).
    delete from public.lead_assignments la
    where not exists (
      select 1 from public.leads l where l.id = la.lead_id
    );

    alter table public.lead_assignments
      add constraint lead_assignments_lead_id_fkey
      foreign key (lead_id)
      references public.leads(id)
      on delete cascade;
  end if;
end$$;

-- Refresh PostgREST's schema cache so it picks up the new
-- relationship without a service restart.
notify pgrst, 'reload schema';
