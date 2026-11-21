-- Migration for 3-level product hierarchy and 3D model support
-- This migration adds:
-- 1. Level field to product_categories (0 = main category, 1 = product-type category)
-- 2. Main category reference for product-type categories
-- 3. Category description/content fields for product-type categories
-- 4. 3D model fields to products table

-- 1. Add level and main_category_id to product_categories
alter table product_categories add column if not exists level int not null default 1 check (level in (0, 1));
alter table product_categories add column if not exists main_category_id uuid references product_categories (id) on delete set null;
alter table product_categories add column if not exists content text not null default '';
alter table product_categories add column if not exists how_it_works text not null default '';
alter table product_categories add column if not exists applications text not null default '';
alter table product_categories add column if not exists usage_info text not null default '';
alter table product_categories add column if not exists industries text not null default '';
alter table product_categories add column if not exists additional_info text not null default '';
alter table product_categories add column if not exists category_image_url text;
alter table product_categories add column if not exists category_image_storage_path text;

-- Index for main category lookups
create index if not exists product_categories_main_category_idx on product_categories (main_category_id);
create index if not exists product_categories_level_idx on product_categories (level);

-- 2. Add 3D model fields to products
alter table products add column if not exists model_url text;
alter table products add column if not exists model_storage_path text;
alter table products add column if not exists model_name text;

-- Index for model lookups
create index if not exists products_model_idx on products (model_storage_path);

-- 3. Update RLS policies to allow public read of active main categories and their product-type children
-- Main categories (level 0) are always readable when active
drop policy if exists "product_categories_public_read" on product_categories;
create policy "product_categories_public_read" on product_categories for select using (
  is_active = true
);

-- 4. Allow service role full access (already exists)
drop policy if exists "product_categories_write_service_role" on product_categories;
create policy "product_categories_write_service_role" on product_categories for all using (false);

-- 5. Products public read policy already exists (status = 'published' and deleted_at is null)
-- No change needed for products table RLS

-- 6. Add comment for documentation
comment on column product_categories.level is '0 = Main Category (Pumps Manufactured by Us / Pumps We Trade), 1 = Product-Type Category';
comment on column product_categories.main_category_id is 'Reference to main category for product-type categories (level 1)';
comment on column product_categories.content is 'Rich text content for category page (description/introduction)';
comment on column product_categories.applications is 'Applications for this product type';
comment on column product_categories.usage_info is 'How and why this pump type is used';
comment on column product_categories.additional_info is 'Additional technical or category information';
comment on column product_categories.category_image_url is 'Optional category image for display';
comment on column products.model_url is 'Public URL for the 3D model (GLB)';
comment on column products.model_storage_path is 'Supabase storage path for the 3D model';
comment on column products.model_name is 'Original filename of the uploaded 3D model';