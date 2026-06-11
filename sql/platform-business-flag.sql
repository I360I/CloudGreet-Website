-- CloudGreet's own receptionist line gets a real businesses row (dogfood
-- tenant) so calendar tools resolve. is_platform marks it for exclusion
-- from the admin client list, map, and finance. Row itself is provisioned
-- at call time by lib/platform-line.ts.
alter table public.businesses
  add column if not exists is_platform boolean not null default false;

comment on column public.businesses.is_platform is
  'True only for CloudGreet''s own receptionist line (dogfood tenant). Excluded from admin client list, map, and finance.';
