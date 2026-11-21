begin;

alter table public.product_categories
  add column if not exists updated_at timestamptz not null default now();

alter table public.product_categories
  add column if not exists description text not null default '';

alter table public.product_categories
  add column if not exists parent_id uuid references public.product_categories (id) on delete set null;

alter table public.product_categories
  add column if not exists is_active boolean not null default true;

alter table public.product_categories
  add column if not exists level integer not null default 1;

alter table public.product_categories
  add column if not exists main_category_id uuid references public.product_categories (id) on delete set null;

alter table public.product_categories
  add column if not exists content text not null default '';

alter table public.product_categories
  add column if not exists how_it_works text not null default '';

alter table public.product_categories
  add column if not exists applications text not null default '';

alter table public.product_categories
  add column if not exists usage_info text not null default '';

alter table public.product_categories
  add column if not exists industries text not null default '';

alter table public.product_categories
  add column if not exists additional_info text not null default '';

alter table public.product_categories
  alter column applications type text using applications::text;

alter table public.product_categories
  add column if not exists category_image_url text;

alter table public.product_categories
  add column if not exists category_image_storage_path text;

alter table public.products
  add column if not exists deleted_at timestamptz;

alter table public.products
  add column if not exists display_order integer not null default 0;

alter table public.products
  add column if not exists gallery_images text[] not null default '{}'::text[];

alter table public.products
  add column if not exists image_storage_path text;

alter table public.products
  add column if not exists gallery_storage_paths text[] not null default '{}'::text[];

alter table public.products
  add column if not exists model_url text;

alter table public.products
  add column if not exists model_storage_path text;

alter table public.products
  add column if not exists model_name text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_categories'::regclass
      and conname = 'product_categories_level_check'
  ) then
    alter table public.product_categories
      add constraint product_categories_level_check check (level in (0, 1));
  end if;
end $$;

create index if not exists product_categories_parent_id_idx
  on public.product_categories (parent_id);

create index if not exists product_categories_main_category_id_idx
  on public.product_categories (main_category_id);

create index if not exists product_categories_level_active_sort_idx
  on public.product_categories (level, is_active, sort_order);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_deleted_at_idx
  on public.products (deleted_at);

alter table public.product_categories enable row level security;

drop policy if exists "product_categories_public_read" on public.product_categories;
create policy "product_categories_public_read"
  on public.product_categories
  for select
  using (is_active);

alter table public.products enable row level security;

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read"
  on public.products
  for select
  using (status = 'published' and deleted_at is null);

insert into public.product_categories (
  id,
  name,
  slug,
  sort_order,
  parent_id,
  level,
  main_category_id,
  description,
  is_active,
  category_image_url,
  updated_at
)
values
  (
    gen_random_uuid(),
    'Pumps Manufactured by Us',
    'pumps-manufactured-by-us',
    0,
    null,
    0,
    null,
    'Positive displacement pumps engineered and manufactured by Pumpsquare for industrial, chemical, food and oil & gas duties.',
    true,
    'https://vqzuvjubeohfsixguzpa.supabase.co/storage/v1/object/public/product-uploads/products/e576994f-96f5-4350-a2f3-27eaeac3e847/images/main-fecd2bd7-ed61-47dc-bdcf-a47d1d1c1ef6.png',
    now()
  ),
  (
    gen_random_uuid(),
    'Pumps Traded by Us (SEIM Pumps)',
    'pumps-traded-by-us',
    1,
    null,
    0,
    null,
    'Genuine SEIM positive displacement pumps and associated equipment supplied through our trading partnership.',
    true,
    'https://vqzuvjubeohfsixguzpa.supabase.co/storage/v1/object/public/product-uploads/products/800dc521-e755-41d5-b28e-b4fc8c85073c/images/main-8e878418-acb6-40a7-b8fb-af25fbd426aa.png',
    now()
  )
on conflict (slug) do nothing;

with seeded_categories (parent_slug, slug, name, sort_order, description) as (
  values
    ('pumps-manufactured-by-us', 'external-gear-pumps', 'External Gear Pumps', 2, 'Robust gear pumps for clean lubricating fluids and hydraulic transfer duties.'),
    ('pumps-manufactured-by-us', 'external-lobe-pumps', 'External Lobe Pumps', 3, 'Gentle, non-contacting lobe pumps for hygienic and viscous products.'),
    ('pumps-manufactured-by-us', 'internal-lobe-pumps', 'Internal Lobe Pumps', 4, 'Internal lobe pumps for gentle transfer of viscous and shear-sensitive products.'),
    ('pumps-manufactured-by-us', 'internal-gear-pumps', 'Internal Gear Pumps', 5, 'Quiet, compact gear pumps for lubricating and process fluids.'),
    ('pumps-manufactured-by-us', 'sectional-pumps', 'Sectional Pumps', 6, 'Modular sectional pumps for industrial transfer applications.'),
    ('pumps-manufactured-by-us', 'shuttle-block-pumps', 'Shuttle Block Pumps', 7, 'Low-shear shuttle block pumps for smooth transfer of viscous media.'),
    ('pumps-manufactured-by-us', 'progressive-cavity-pumps', 'Progressive Cavity Pumps', 8, 'Helical rotor/stator pumps for viscous, abrasive and shear-sensitive fluids.'),
    ('pumps-manufactured-by-us', 'triple-screw-pumps', 'Triple Screw Pumps', 9, 'Quiet, pulsation-free screw pumps for oil, hydraulic and fuel duties.'),
    ('pumps-manufactured-by-us', 'twin-screw-pumps', 'Twin Screw Pumps', 10, 'High-capacity, low-shear pumps for viscous and multiphase liquids.'),
    ('pumps-manufactured-by-us', 'gerotor-pumps', 'Gerotor Pumps', 11, 'Compact gerotor pumps for lubrication and hydraulic systems.'),
    ('pumps-manufactured-by-us', 'trochoidal-gear-pumps', 'Trochoidal Gear Pumps', 12, 'Smooth, low-pulsation trochoidal pumps for lubrication duties.'),
    ('pumps-traded-by-us', 'seim-pumps-series', 'SEIM Pumps Series', 13, 'SEIM series pumps and associated traded equipment.')
)
insert into public.product_categories (
  id,
  name,
  slug,
  sort_order,
  parent_id,
  level,
  main_category_id,
  description,
  is_active,
  category_image_url,
  updated_at
)
select
  gen_random_uuid(),
  s.name,
  s.slug,
  s.sort_order,
  p.id,
  1,
  p.id,
  s.description,
  true,
  null,
  now()
from seeded_categories s
join public.product_categories p on p.slug = s.parent_slug
on conflict (slug) do nothing;

update public.product_categories
set is_active = false,
    updated_at = now()
where level = 0
  and slug not in ('pumps-manufactured-by-us', 'pumps-traded-by-us');

update public.product_categories
set is_active = false,
    updated_at = now()
where slug in ('pumps', 'valves', 'filters-strainers', 'other-divisions', 'seim-srl-pumps', 'pumps-series');

with product_targets as (
  select
    p.id,
    case
      when pc.slug in ('seim-srl-pumps', 'pumps-series') then 'seim-pumps-series'
      when h.haystack ~ 'internal.{0,12}lobe' then 'internal-lobe-pumps'
      when h.haystack ~ 'external.{0,12}lobe' then 'external-lobe-pumps'
      when h.haystack ~ 'lobe' then 'external-lobe-pumps'
      when h.haystack ~ 'progressive.{0,12}cavity' then 'progressive-cavity-pumps'
      when h.haystack ~ 'triple.{0,12}screw' then 'triple-screw-pumps'
      when h.haystack ~ 'twin.{0,12}screw' then 'twin-screw-pumps'
      when h.haystack ~ 'screw' then 'triple-screw-pumps'
      when h.haystack ~ 'shuttle.{0,12}block' then 'shuttle-block-pumps'
      when h.haystack ~ 'trochoidal' then 'trochoidal-gear-pumps'
      when h.haystack ~ 'gerotor' then 'gerotor-pumps'
      when h.haystack ~ 'sectional' then 'sectional-pumps'
      when h.haystack ~ 'internal.{0,12}gear' then 'internal-gear-pumps'
      when h.haystack ~ 'external.{0,12}gear' then 'external-gear-pumps'
      when h.haystack ~ 'gear' then 'external-gear-pumps'
      else null
    end as target_slug
  from public.products p
  left join public.product_categories pc on pc.id = p.category_id
  cross join lateral (
    select lower(coalesce(p.slug, '') || ' ' || coalesce(p.name, '')) as haystack
  ) h
  where p.deleted_at is null
)
update public.products p
set category_id = c.id,
    updated_at = now()
from product_targets t
join public.product_categories c
  on c.slug = t.target_slug
 and c.is_active
 and c.level = 1
where p.id = t.id
  and t.target_slug is not null
  and p.category_id is distinct from c.id;

commit;

select
  level,
  slug,
  name,
  sort_order,
  is_active,
  parent_id,
  main_category_id,
  category_image_url
from public.product_categories
where is_active
order by level, sort_order, slug;

select count(*) as active_main_categories
from public.product_categories
where level = 0
  and is_active;

select
  mc.slug as main_category_slug,
  count(p.id) as product_count
from public.product_categories mc
left join public.product_categories tc
  on tc.main_category_id = mc.id
 and tc.is_active
left join public.products p
  on p.category_id = tc.id
 and p.deleted_at is null
where mc.level = 0
  and mc.is_active
group by mc.slug
order by mc.slug;

select
  p.slug,
  p.name,
  c.slug as category_slug,
  c.level,
  c.main_category_id
from public.products p
left join public.product_categories c on c.id = p.category_id
where p.deleted_at is null
  and (
    c.id is null
    or c.level is distinct from 1
    or c.main_category_id is null
  )
order by p.slug;
