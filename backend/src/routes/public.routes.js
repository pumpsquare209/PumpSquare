import express from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { getSupabaseAdmin, getSupabasePublic } from "../lib/supabase.js";
import { hasDynamicReviewTabs, hasProductMigration, getCategoryColumns } from "../lib/product-schema.js";
import { textValue } from "../lib/text.js";

const router = express.Router();

const REVIEW_TAB_KEYS = ["series", "operational", "installation", "advantages", "industry", "sector", "application", "measures"];
const STANDARD_TAB_LABELS = ["Series", "Operational", "Installation", "Advantages", "Industry", "Sector", "Application", "Measures"];
const PRIVATE_PREFIX = "private:";
const STORAGE_BUCKET = "product-uploads";

function toPublicStorageUrl(storagePath) {
  if (!storagePath) return null;
  return getSupabasePublic().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

/**
 * The upload flow stores `private:<key>` in the *_url columns, while
 * catalogue_storage_path/datasheet_storage_path hold the bare object key. Read
 * the path column first and fall back to the reference for older rows.
 */
function documentStoragePath(pathColumn, urlColumn) {
  if (pathColumn) return pathColumn;
  if (urlColumn?.startsWith(PRIVATE_PREFIX)) return urlColumn.slice(PRIVATE_PREFIX.length);
  return null;
}

// Canonical name of a standard tab; null for custom keys (never shown as a name).
const standardLabel = (key) => {
  const index = REVIEW_TAB_KEYS.indexOf(key);
  return index === -1 ? null : STANDARD_TAB_LABELS[index];
};

// Tab rows from before the label column existed carry a custom tab's name in
// its heading row attribute (written by the admin API). It is read back here and
// never leaks into the heading text.
const LEGACY_HEADING = /^<p data-tab-label="([^"]*)">([\s\S]*)<\/p>$/;
const splitLegacyHeading = (heading) => {
  const match = LEGACY_HEADING.exec(heading ?? "");
  if (!match) return { label: "", heading };
  return {
    label: match[1].replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))),
    heading: match[2],
  };
};

const emptyTechnical = () => ({
  tabs: REVIEW_TAB_KEYS.map((key) => ({
    key,
    label: standardLabel(key),
    isCustom: false,
    sortOrder: REVIEW_TAB_KEYS.indexOf(key),
    enabled: true,
    heading: "",
    intro: "",
    features: [],
  })),
  performance: { columns: [], rows: [] },
  materials: [],
  paragraphs: [],
});

/**
 * Technical content for a product. Read with the service role because the tab
 * tables are not exposed to the anon key; the caller has already restricted
 * the product to status = 'published'.
 */
async function loadTechnical(productId) {
  const supabase = getSupabaseAdmin();
  const technical = emptyTechnical();
  const dynamicTabs = await hasDynamicReviewTabs();
  const tabColumns = dynamicTabs
    ? "tab_key, label, is_custom, sort_order, enabled, heading, intro"
    : "tab_key, enabled, heading, intro";

  const [tabs, features, columns, rows, materials, paragraphs] = await Promise.all([
    supabase.from("product_review_tabs").select(tabColumns).eq("product_id", productId),
    supabase.from("product_review_features").select("tab_key, label, detail").eq("product_id", productId).order("sort_order"),
    supabase.from("product_performance_columns").select("id, name, unit").eq("product_id", productId).order("sort_order"),
    supabase.from("product_performance_rows").select("id").eq("product_id", productId).order("sort_order"),
    supabase.from("product_materials").select("id, component, material, specification").eq("product_id", productId).order("sort_order"),
    supabase.from("product_explanation_paragraphs").select("id, html").eq("product_id", productId).order("sort_order"),
  ]);

  if (tabs.error && tabs.error.code === "42P01") return technical;
  for (const result of [tabs, features, columns, rows, materials, paragraphs]) {
    if (result.error && result.error.code !== "42P01") throw result.error;
  }

  if (tabs.data?.length) {
    // The eight standard tabs first, then custom tabs, each group in saved order.
    technical.tabs = tabs.data
      .filter((tab) => tab.enabled)
      .map((tab) => {
        const standardIndex = REVIEW_TAB_KEYS.indexOf(tab.tab_key);
        const legacy = standardIndex === -1 && tab.label === undefined ? splitLegacyHeading(tab.heading) : null;
        // Labels are passed through exactly as stored; the key is only a
        // fallback for standard tabs, never for custom ones.
        return {
          key: tab.tab_key,
          label: tab.label ?? standardLabel(tab.tab_key) ?? legacy?.label ?? "",
          isCustom: standardIndex === -1,
          sortOrder: standardIndex === -1 ? (tab.sort_order ?? REVIEW_TAB_KEYS.length) : (tab.sort_order ?? standardIndex),
          enabled: true,
          heading: legacy?.heading ?? tab.heading ?? "",
          intro: tab.intro ?? "",
          features: [],
        };
      })
      .sort((a, b) => Number(a.isCustom) - Number(b.isCustom) || a.sortOrder - b.sortOrder)
      .map(({ isCustom, sortOrder, ...tab }) => tab);
  }
  for (const feature of features.data ?? []) {
    technical.tabs.find((tab) => tab.key === feature.tab_key)?.features.push({
      label: feature.label ?? undefined,
      text: feature.detail,
    });
  }
  // Tabs left empty (e.g. created but never filled in) must not break the page.
  technical.tabs = technical.tabs.filter(
    (tab) =>
      tab.features.length > 0 ||
      tab.heading.trim() ||
      tab.intro.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").trim(),
  );
  technical.performance.columns = (columns.data ?? []).map((column) => ({ id: column.id, name: column.name, unit: column.unit ?? "" }));

  const rowIds = (rows.data ?? []).map((row) => row.id);
  let cells = [];
  if (rowIds.length) {
    const { data, error } = await supabase
      .from("product_performance_cells")
      .select("row_id, column_id, value")
      .in("row_id", rowIds);
    if (error && error.code !== "42P01") throw error;
    cells = data ?? [];
  }
  technical.performance.rows = (rows.data ?? []).map((row) => ({
    id: row.id,
    cells: Object.fromEntries(cells.filter((cell) => cell.row_id === row.id).map((cell) => [cell.column_id, cell.value])),
  }));
  technical.materials = (materials.data ?? []).map((item) => ({
    id: item.id,
    component: item.component,
    material: item.material,
    specification: item.specification ?? "",
  }));
  technical.paragraphs = (paragraphs.data ?? []).map((p) => ({ id: p.id, html: p.html }));

  return technical;
}

// Public: Get published products
router.get("/products", async (req, res) => {
  try {
    const migrated = await hasProductMigration();
    let query = getSupabasePublic()
      .from("products")
      .select(
        migrated
          ? `slug, name, image_url, summary, display_order,
        product_categories (slug, name)`
          : `slug, name, image_url, summary,
        product_categories (slug, name)`,
      )
      .eq("status", "published");
    if (migrated) query = query.is("deleted_at", null);
    if (migrated) query = query.order("display_order").order("name");
    else query = query.order("name");
    const { data, error } = await query;

    if (error) throw error;

    const products = (data ?? []).map((p) => ({
      slug: p.slug,
      name: p.name,
      image: p.image_url,
      summary: p.summary,
      category: p.product_categories ? { slug: p.product_categories.slug, name: p.product_categories.name } : null,
      displayOrder: p.display_order ?? 0,
    }));

    res.json({ ok: true, products });
  } catch (err) {
    console.error("GET /api/products error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch products" });
  }
});

// Public: Get published product by slug
router.get("/products/:slug", async (req, res) => {
  try {
    const migrated = await hasProductMigration();
    let query = getSupabasePublic()
      .from("products")
      .select(`
        *,
        product_categories (slug, name)
      `)
      .eq("slug", req.params.slug)
      .eq("status", "published");
    if (migrated) query = query.is("deleted_at", null);
    const { data, error } = await query.single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ ok: false, message: "Product not found" });
      throw error;
    }

    const cataloguePath = documentStoragePath(data.catalogue_storage_path, data.catalogue_url);
    const datasheetPath = documentStoragePath(data.datasheet_storage_path, data.datasheet_url);
    const modelPath = documentStoragePath(data.model_storage_path, data.model_url);

    const product = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      category: data.product_categories ? { slug: data.product_categories.slug, name: data.product_categories.name } : null,
      summary: data.summary,
      description: data.description,
      image: data.image_url,
      galleryImages: data.gallery_images ?? [],
      series: data.series ?? [],
      features: data.features ?? [],
      applications: data.applications ?? [],
      specifications: data.specifications ?? {},
      materials: data.materials ?? {},
      datasheetUrl: datasheetPath ? toPublicStorageUrl(datasheetPath) : data.datasheet_url,
      datasheetName: data.datasheet_name,
      datasheetStoragePath: datasheetPath,
      catalogueUrl: toPublicStorageUrl(cataloguePath),
      catalogueName: data.catalogue_name ?? null,
      catalogueStoragePath: cataloguePath,
      catalogueAvailable: Boolean(cataloguePath),
      seoTitle: data.seo_title ?? null,
      seoDescription: data.seo_description ?? null,
      modelUrl: modelPath ? toPublicStorageUrl(modelPath) : data.model_url ?? null,
      modelStoragePath: modelPath,
      modelName: data.model_name ?? null,
      updatedAt: data.updated_at,
      technical: await loadTechnical(data.id),
    };

    res.json({ ok: true, product });
  } catch (err) {
    console.error("GET /api/products/:slug error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch product" });
  }
});

const STORAGE_KEY_PATTERN = /^products\/[0-9a-f-]{36}\/documents\/[a-z0-9-]+(?:\.[a-z0-9]+)?$/;

/**
 * Serves a product document (legacy `private:<key>` links). Access is granted
 * only while the owning product is published, so drafts keep their files private.
 * Public catalogue downloads use the Supabase public URL directly; this route
 * remains for links that reference a document by object key.
 */
router.get("/files/:key(*)", async (req, res) => {
  try {
    const key = req.params.key;
    const allowed = key.startsWith("documents/") || STORAGE_KEY_PATTERN.test(key);
    if (!allowed || key.includes("..")) {
      return res.status(404).json({ ok: false, message: "File not found" });
    }

    // Owners may reference the key either as `private:<key>` or as the bare
    // key stored in catalogue_storage_path/datasheet_storage_path.
    const reference = `${PRIVATE_PREFIX}${key}`;
    const columns = "id, datasheet_url, datasheet_name, catalogue_url, catalogue_name";
    const migrated = await hasProductMigration();
    const withPublication = (query) => {
      const scoped = query.eq("status", "published");
      return migrated ? scoped.is("deleted_at", null) : scoped;
    };
    const { data: owners, error: lookupError } = await withPublication(getSupabaseAdmin().from("products").select(columns))
      .or(`datasheet_url.eq.${JSON.stringify(reference)},catalogue_url.eq.${JSON.stringify(reference)}`);
    if (lookupError) {
      console.error(`[files] product lookup failed for ${key}:`, lookupError);
      return res.status(500).json({ ok: false, message: "Failed to fetch file" });
    }

    let owner = (owners ?? []).find((row) => row.datasheet_url === reference || row.catalogue_url === reference);
    if (!owner) {
      const { data: pathOwners, error: pathLookupError } = await withPublication(
        getSupabaseAdmin().from("products").select(`${columns}, catalogue_storage_path, datasheet_storage_path`),
      ).or(`catalogue_storage_path.eq.${JSON.stringify(key)},datasheet_storage_path.eq.${JSON.stringify(key)}`);
      if (pathLookupError) {
        console.error(`[files] storage-path lookup failed for ${key}:`, pathLookupError);
        return res.status(500).json({ ok: false, message: "Failed to fetch file" });
      }
      owner = (pathOwners ?? []).find((row) => row.catalogue_storage_path === key || row.datasheet_storage_path === key);
    }
    if (!owner) {
      console.warn(`[files] no published product references ${key}`);
      return res.status(404).json({ ok: false, message: "File not found" });
    }

    const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: blob, error: downloadError } = await storage.storage.from(STORAGE_BUCKET).download(key);
    if (downloadError || !blob) {
      console.error(`[files] storage download failed for ${key}:`, downloadError);
      const status = downloadError?.statusCode === "404" || downloadError?.message === "Object not found" ? 404 : 502;
      return res.status(status).json({
        ok: false,
        message: status === 404 ? "File not found" : "Failed to fetch file",
      });
    }

    const isCatalogue =
      owner.catalogue_storage_path === key || owner.catalogue_url === reference || owner.catalogue_url === key;
    const name = (isCatalogue ? owner.catalogue_name : owner.datasheet_name) || key.split("/").pop();
    const safeName = String(name).replace(/[^\w .()-]/g, "_");
    const disposition = req.query.download === "1" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(Buffer.from(await blob.arrayBuffer()));
  } catch (err) {
    console.error("GET /api/files error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch file" });
  }
});

// Public: Get categories
router.get("/categories", async (req, res) => {
  try {
    const columns = await getCategoryColumns();
    const fields = ["id", "slug", "name", "sort_order"];
    for (const [column, field] of [
      ["parent_id", "parent_id"],
      ["is_active", "is_active"],
      ["description", "description"],
      ["level", "level"],
      ["main_category_id", "main_category_id"],
      ["content", "content"],
      ["how_it_works", "how_it_works"],
      ["applications", "applications"],
      ["usage_info", "usage_info"],
      ["industries", "industries"],
      ["additional_info", "additional_info"],
      ["category_image_url", "category_image_url"],
    ]) {
      if (columns[column]) fields.push(field);
    }

    const { data, error } = await getSupabasePublic()
      .from("product_categories")
      .select(fields.join(", "))
      .order("sort_order")
      .order("name");

    if (error) throw error;

    const categories = (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      parentId: columns.parent_id ? row.parent_id ?? null : null,
      isActive: columns.is_active ? row.is_active !== false : true,
      sortOrder: row.sort_order ?? 0,
      level: columns.level ? row.level ?? 1 : undefined,
      mainCategoryId: columns.main_category_id ? row.main_category_id ?? null : null,
      description: columns.description ? textValue(row.description) : "",
      content: columns.content ? textValue(row.content) : "",
      howItWorks: columns.how_it_works ? textValue(row.how_it_works) : "",
      applications: columns.applications ? textValue(row.applications) : "",
      usageInfo: columns.usage_info ? textValue(row.usage_info) : "",
      industries: columns.industries ? textValue(row.industries) : "",
      additionalInfo: columns.additional_info ? textValue(row.additional_info) : "",
      categoryImageUrl: columns.category_image_url ? row.category_image_url ?? null : null,
    }));

    const activeIds = new Set(categories.filter((row) => row.isActive).map((row) => row.id));
    const visibleCategories = categories.filter(
      (row) => row.isActive && (!row.parentId || activeIds.has(row.parentId)),
    );

    res.json({ ok: true, categories: visibleCategories });
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch categories" });
  }
});

export default router;
