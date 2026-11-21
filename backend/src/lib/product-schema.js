import { getSupabaseAdmin } from "./supabase.js";

// Present only after `npm run db:migrate` has added them to the products table.
const MIGRATED_COLUMNS = ["deleted_at", "display_order", "gallery_images"];
// Storage-path columns arrive with the same migration but are detected
// separately: a database without the default columns can still have them, and
// they must keep saving regardless of which other columns exist.
const STORAGE_COLUMNS = ["image_storage_path", "gallery_storage_paths", "catalogue_storage_path", "datasheet_storage_path", "model_storage_path"];

const columnCache = new Map();

/**
 * Columns are probed one at a time because PostgREST reports only the first
 * missing column of a select. A plain "select *" check cannot be used either:
 * the service key is unrestricted and silently returns every column.
 */
function hasColumns(key, columns) {
  if (!columnCache.has(key)) {
    const pending = (async () => {
      const present = {};
      for (const column of columns) {
        const { error } = await getSupabaseAdmin().from("products").select(column).limit(1);
        if (error && error.code !== "42703") throw error;
        present[column] = !error;
      }
      return present;
    })();
    columnCache.set(key, pending);
    pending.catch(() => {
      columnCache.delete(key);
    });
  }
  return columnCache.get(key);
}

export async function hasProductMigration() {
  const present = await hasColumns("defaults", MIGRATED_COLUMNS);
  return MIGRATED_COLUMNS.every((column) => present[column]);
}

export async function hasStoragePathColumns() {
  const present = await hasColumns("storage", STORAGE_COLUMNS);
  return {
    image: present.image_storage_path,
    gallery: present.gallery_storage_paths,
    catalogue: present.catalogue_storage_path,
    datasheet: present.datasheet_storage_path,
    model: present.model_storage_path,
  };
}

let reviewTabState = null;

/**
 * Dynamic tabs (label, is_custom, sort_order) arrive with the review tab
 * migration. Until it runs, tabs are saved with the standard columns only.
 */
export async function hasDynamicReviewTabs() {
  if (reviewTabState === null) {
    const { error } = await getSupabaseAdmin().from("product_review_tabs").select("label, is_custom, sort_order").limit(1);
    if (!error) reviewTabState = true;
    else if (error.code === "42703" || error.code === "PGRST204") reviewTabState = false;
    else if (error.code === "42P01") reviewTabState = false;
    else throw error;
  }
  return reviewTabState;
}

const CATEGORY_COLUMNS = [
  "parent_id",
  "is_active",
  "description",
  "level",
  "main_category_id",
  "content",
  "how_it_works",
  "applications",
  "usage_info",
  "industries",
  "additional_info",
  "category_image_url",
  "category_image_storage_path",
];

let categoryColumnsState = null;

export async function getCategoryColumns() {
  if (categoryColumnsState === null) {
    categoryColumnsState = (async () => {
      const present = {};
      for (const column of CATEGORY_COLUMNS) {
        const { error } = await getSupabaseAdmin().from("product_categories").select(column).limit(1);
        if (error && !["42703", "PGRST204"].includes(error.code)) throw error;
        present[column] = !error;
      }
      return present;
    })();
    categoryColumnsState.catch(() => {
      categoryColumnsState = null;
    });
  }
  return categoryColumnsState;
}

export async function hasCategoryColumns() {
  const columns = await getCategoryColumns();
  return Boolean(columns.parent_id && columns.is_active && columns.description);
}
