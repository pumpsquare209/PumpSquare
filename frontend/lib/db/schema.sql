create table if not exists admin_users (
  id uuid primary key,
  email text not null,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('superadmin', 'product_manager', 'read_only')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create unique index if not exists admin_users_email_key on admin_users (lower(email));

create table if not exists admin_sessions (
  token_hash text primary key,
  user_id uuid not null references admin_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists admin_sessions_user_idx on admin_sessions (user_id);

create table if not exists admin_login_attempts (
  identifier text primary key,
  failures int not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

create table if not exists product_categories (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  description text not null default '',
  parent_id uuid references product_categories (id) on delete set null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table product_categories add column if not exists description text not null default '';
alter table product_categories add column if not exists parent_id uuid references product_categories (id) on delete set null;
alter table product_categories add column if not exists is_active boolean not null default true;
alter table product_categories add column if not exists updated_at timestamptz not null default now();

create index if not exists product_categories_parent_idx on product_categories (parent_id);
create index if not exists product_categories_active_idx on product_categories (is_active);

create table if not exists products (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  category_id uuid references product_categories (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  summary text not null default '',
  description text not null default '',
  image_url text,
  datasheet_url text,
  datasheet_name text,
  series text[] not null default '{}',
  features text[] not null default '{}',
  applications text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  materials jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  display_order int not null default 0,
  gallery_images text[] not null default '{}',
  catalogue_url text,
  catalogue_name text,
  seo_title text,
  seo_description text,
  image_storage_path text,
  gallery_storage_paths text[] not null default '{}',
  catalogue_storage_path text,
  datasheet_storage_path text
);

alter table products add column if not exists deleted_at timestamptz;
alter table products add column if not exists display_order int not null default 0;
alter table products add column if not exists gallery_images text[] not null default '{}';
alter table products add column if not exists catalogue_url text;
alter table products add column if not exists catalogue_name text;
alter table products add column if not exists seo_title text;
alter table products add column if not exists seo_description text;
alter table products add column if not exists image_storage_path text;
alter table products add column if not exists gallery_storage_paths text[] not null default '{}';
alter table products add column if not exists catalogue_storage_path text;
alter table products add column if not exists datasheet_storage_path text;

create index if not exists products_status_idx on products (status);
create index if not exists products_category_idx on products (category_id);
create index if not exists products_display_order_idx on products (display_order, name);
create index if not exists products_deleted_idx on products (deleted_at);

alter table admin_users enable row level security;
alter table admin_sessions enable row level security;
alter table admin_login_attempts enable row level security;
alter table product_categories enable row level security;
alter table products enable row level security;

drop policy if exists "admin_users_service_role_only" on admin_users;
create policy "admin_users_service_role_only" on admin_users for all using (false);

drop policy if exists "admin_sessions_service_role_only" on admin_sessions;
create policy "admin_sessions_service_role_only" on admin_sessions for all using (false);

drop policy if exists "admin_login_attempts_service_role_only" on admin_login_attempts;
create policy "admin_login_attempts_service_role_only" on admin_login_attempts for all using (false);

drop policy if exists "product_categories_public_read" on product_categories;
create policy "product_categories_public_read" on product_categories for select using (is_active);

drop policy if exists "product_categories_write_service_role" on product_categories;
create policy "product_categories_write_service_role" on product_categories for all using (false);

drop policy if exists "products_public_read" on products;
create policy "products_public_read" on products for select using (status = 'published' and deleted_at is null);

drop policy if exists "products_write_service_role" on products;
create policy "products_write_service_role" on products for all using (false);

-- Technical information tabs ("Product Reviews" section).
-- Tab copy is per product and per tab; the performance table, materials table
-- and explanation paragraphs below belong to the product and are shared by
-- every tab.
--
-- Tabs are dynamic: the eight standard tabs are seeded per product by the API
-- (is_custom = false) and administrators can add custom tabs (is_custom = true).
-- tab_key is stable per product and survives renames; label is the visible name
-- stored exactly as the administrator typed it (never derived from tab_key).
create table if not exists product_review_tabs (
  product_id uuid not null references products (id) on delete cascade,
  tab_key text not null,
  enabled boolean not null default true,
  heading text not null default '',
  intro text not null default '',
  updated_at timestamptz not null default now(),
  primary key (product_id, tab_key)
);

-- Earlier versions restricted tab_key to the eight standard keys.
alter table product_review_tabs drop constraint if exists product_review_tabs_tab_key_check;

alter table product_review_tabs add column if not exists label text not null default '';
alter table product_review_tabs add column if not exists is_custom boolean not null default false;
alter table product_review_tabs add column if not exists sort_order int not null default 0;

-- Keep the standard order for pre-existing rows; custom tabs continue after.
update product_review_tabs
set sort_order = case tab_key
  when 'series' then 0
  when 'operational' then 1
  when 'installation' then 2
  when 'advantages' then 3
  when 'industry' then 4
  when 'sector' then 5
  when 'application' then 6
  when 'measures' then 7
  else 8
end
where sort_order = 0
  and tab_key in ('series', 'operational', 'installation', 'advantages', 'industry', 'sector', 'application', 'measures');

create index if not exists product_review_tabs_product_order_idx on product_review_tabs (product_id, sort_order);

create table if not exists product_review_features (
  id uuid primary key,
  product_id uuid not null,
  tab_key text not null,
  label text,
  detail text not null default '',
  sort_order int not null default 0,
  foreign key (product_id, tab_key) references product_review_tabs (product_id, tab_key) on delete cascade
);

create index if not exists product_review_features_product_idx on product_review_features (product_id, tab_key, sort_order);

create table if not exists product_performance_columns (
  id uuid primary key,
  product_id uuid not null references products (id) on delete cascade,
  name text not null,
  unit text not null default '',
  sort_order int not null default 0
);

create index if not exists product_performance_columns_product_idx on product_performance_columns (product_id, sort_order);

create table if not exists product_performance_rows (
  id uuid primary key,
  product_id uuid not null references products (id) on delete cascade,
  sort_order int not null default 0
);

create index if not exists product_performance_rows_product_idx on product_performance_rows (product_id, sort_order);

create table if not exists product_performance_cells (
  row_id uuid not null references product_performance_rows (id) on delete cascade,
  column_id uuid not null references product_performance_columns (id) on delete cascade,
  value text not null default '',
  primary key (row_id, column_id)
);

create table if not exists product_materials (
  id uuid primary key,
  product_id uuid not null references products (id) on delete cascade,
  component text not null,
  material text not null,
  specification text not null default '',
  sort_order int not null default 0
);

create index if not exists product_materials_product_idx on product_materials (product_id, sort_order);

create table if not exists product_explanation_paragraphs (
  id uuid primary key,
  product_id uuid not null references products (id) on delete cascade,
  html text not null default '',
  sort_order int not null default 0
);

create index if not exists product_explanation_paragraphs_product_idx on product_explanation_paragraphs (product_id, sort_order);

alter table product_review_tabs enable row level security;
alter table product_review_features enable row level security;
alter table product_performance_columns enable row level security;
alter table product_performance_rows enable row level security;
alter table product_performance_cells enable row level security;
alter table product_materials enable row level security;
alter table product_explanation_paragraphs enable row level security;

-- Public visitors may read visible tabs of published products; the backend
-- (service role) reads and writes everything. Hidden tabs stay private.
drop policy if exists "product_review_tabs_public_read" on product_review_tabs;
create policy "product_review_tabs_public_read" on product_review_tabs for select using (
  enabled
  and exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.deleted_at is null)
);

drop policy if exists "product_review_features_public_read" on product_review_features;
create policy "product_review_features_public_read" on product_review_features for select using (
  exists (
    select 1 from product_review_tabs t
    join products p on p.id = t.product_id
    where t.product_id = product_review_features.product_id
      and t.tab_key = product_review_features.tab_key
      and t.enabled
      and p.status = 'published'
      and p.deleted_at is null
  )
);

drop policy if exists "product_performance_columns_public_read" on product_performance_columns;
create policy "product_performance_columns_public_read" on product_performance_columns for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.deleted_at is null)
);

drop policy if exists "product_performance_rows_public_read" on product_performance_rows;
create policy "product_performance_rows_public_read" on product_performance_rows for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.deleted_at is null)
);

drop policy if exists "product_performance_cells_public_read" on product_performance_cells;
create policy "product_performance_cells_public_read" on product_performance_cells for select using (
  exists (
    select 1 from product_performance_rows r
    join products p on p.id = r.product_id
    where r.id = row_id and p.status = 'published' and p.deleted_at is null
  )
);

drop policy if exists "product_materials_public_read" on product_materials;
create policy "product_materials_public_read" on product_materials for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.deleted_at is null)
);

drop policy if exists "product_explanation_paragraphs_public_read" on product_explanation_paragraphs;
create policy "product_explanation_paragraphs_public_read" on product_explanation_paragraphs for select using (
  exists (select 1 from products p where p.id = product_id and p.status = 'published' and p.deleted_at is null)
);
