-- Idempotent repair for public.product_categories.
-- Run in the Supabase SQL Editor against the project used by the backend.
-- Safe to re-run: no tables, rows, indexes, constraints, policies are dropped.

begin;

-- Columns referenced by GET /api/admin/categories, POST /api/admin/categories,
-- PATCH /api/admin/categories/:id and GET /api/categories.
alter table public.product_categories add column if not exists updated_at timestamptz not null default now();
alter table public.product_categories add column if not exists description text not null default '';
alter table public.product_categories add column if not exists parent_id uuid references public.product_categories (id) on delete set null;
alter table public.product_categories add column if not exists is_active boolean not null default true;
alter table public.product_categories add column if not exists level integer not null default 1;
alter table public.product_categories add column if not exists main_category_id uuid references public.product_categories (id) on delete set null;
alter table public.product_categories add column if not exists content text not null default '';
alter table public.product_categories add column if not exists how_it_works text not null default '';
alter table public.product_categories add column if not exists applications text not null default '';
alter table public.product_categories add column if not exists usage_info text not null default '';
alter table public.product_categories add column if not exists industries text not null default '';
alter table public.product_categories add column if not exists additional_info text not null default '';
alter table public.product_categories add column if not exists category_image_url text;
alter table public.product_categories add column if not exists category_image_storage_path text;

-- The Add/Edit form and the admin API write applications as a string.
-- Some databases have this column as an array, which rejects those writes.
-- Convert array values to newline-separated text without dropping any content.
do $$
declare
  applications_type text;
begin
  select data_type
    into applications_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'product_categories'
     and column_name = 'applications';

  if applications_type = 'ARRAY' then
    execute 'alter table public.product_categories alter column applications drop default';
    execute $convert$
      alter table public.product_categories
        alter column applications type text
        using case
          when applications is null then null
          else array_to_string(applications::text[], E'\n')
        end
    $convert$;
    execute $default$alter table public.product_categories alter column applications set default ''$default$;
  end if;
end $$;

-- Add the hierarchy check only when it is absent and all existing rows are valid.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.product_categories'::regclass
       and conname = 'product_categories_level_check'
  ) and not exists (
    select 1
      from public.product_categories
     where level not in (0, 1)
  ) then
    alter table public.product_categories
      add constraint product_categories_level_check check (level in (0, 1));
  end if;
end $$;

create index if not exists product_categories_parent_id_idx on public.product_categories (parent_id);
create index if not exists product_categories_main_category_id_idx on public.product_categories (main_category_id);
create index if not exists product_categories_level_active_sort_idx on public.product_categories (level, is_active, sort_order);
create index if not exists product_categories_active_idx on public.product_categories (is_active);
create index if not exists product_categories_level_idx on public.product_categories (level);

commit;

-- Optional verification after running:
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public'
--    and table_name = 'product_categories'
--  order by ordinal_position;
