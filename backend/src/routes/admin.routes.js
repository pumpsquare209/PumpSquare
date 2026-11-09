import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import express from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { hasCategoryColumns, hasDynamicReviewTabs, hasProductMigration, hasStoragePathColumns } from "../lib/product-schema.js";

const router = express.Router();
const JWT_SECRET = env.JWT_SECRET;
const SESSION_COOKIE = "psq_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const PERMISSIONS_REF = {
  superadmin: ["products:write", "categories:write", "files:upload", "users:manage"],
  product_manager: ["products:write", "categories:write", "files:upload"],
  read_only: [],
};

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(res, token) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

function generateToken() {
  return randomUUID() + randomUUID();
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

function logLoginStage(email, stage, detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  console.info(`[admin-login] email=${email} stage=${stage}${suffix}`);
}

router.post("/auth/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, code: "INVALID", message: "Invalid email or password" });
    }

    const { email, password } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: rows, error } = await supabase
      .from("admin_users")
      .select("id, email, name, role, password_hash, is_active")
      .eq("email", email)
      .limit(2);

    if (error) {
      logLoginStage(email, "lookup-failed", `code=${error.code} status=${res.statusCode}`);
      return res.status(503).json({ ok: false, code: "SERVER_ERROR", message: "Authentication is temporarily unavailable" });
    }

    // The unique index is on lower(email); fall back to a case-insensitive match
    // when stored casing differs but still resolve to exactly one account.
    let user = rows?.find((row) => row.email === email);
    if (!user && rows?.length === 1) user = rows[0];

    logLoginStage(email, "lookup", `found=${Boolean(user)} active=${user?.is_active ?? "n/a"} role=${user?.role ?? "n/a"}`);

    if (!user) {
      return res.status(401).json({ ok: false, code: "INVALID", message: "Incorrect email or password" });
    }

    if (!user.is_active) {
      return res.status(401).json({ ok: false, code: "INVALID", message: "Account disabled" });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, user.password_hash);
    } catch (compareError) {
      logLoginStage(email, "compare-error", `name=${compareError.name}`);
      return res.status(401).json({ ok: false, code: "INVALID", message: "Incorrect email or password" });
    }
    logLoginStage(email, "compare", `match=${valid}`);

    if (!valid) {
      return res.status(401).json({ ok: false, code: "INVALID", message: "Incorrect email or password" });
    }

    if (!Object.hasOwn(PERMISSIONS_REF, user.role)) {
      logLoginStage(email, "role-rejected", `role=${JSON.stringify(user.role)}`);
      return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "This account has no admin access" });
    }
    logLoginStage(email, "success", `role=${user.role}`);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await supabase.from("admin_sessions").insert({
      token_hash: hashToken(token),
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    });

    setSessionCookie(res, token);

    res.json({ ok: true, user: { name: user.name, role: user.role } });
  } catch (err) {
    console.error("POST /api/admin/auth/login error:", err);
    res.status(500).json({ ok: false, code: "SERVER_ERROR", message: "Something went wrong" });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    const token = req.cookies[SESSION_COOKIE];
    if (token) {
      const supabase = getSupabaseAdmin();
      await supabase.from("admin_sessions").delete().eq("token_hash", hashToken(token));
    }
    clearSessionCookie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/auth/logout error:", err);
    res.status(500).json({ ok: false, message: "Failed to logout" });
  }
});

router.delete("/auth/sessions", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, code: "INVALID", message: "userId required" });
    }
    const supabase = getSupabaseAdmin();
    await supabase.from("admin_sessions").delete().eq("user_id", userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/auth/sessions error:", err);
    res.status(500).json({ ok: false, message: "Failed to destroy sessions" });
  }
});

router.post("/auth/session", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ ok: false, code: "INVALID", message: "userId required" });
    }
    const supabase = getSupabaseAdmin();
    const token = randomUUID() + randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await supabase.from("admin_sessions").insert({
      token_hash: hashToken(token),
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    });

    setSessionCookie(res, token);
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/auth/session error:", err);
    res.status(500).json({ ok: false, message: "Failed to create session" });
  }
});

router.get("/auth/me", requireAuth, (req, res) => {
  const user = req.user;
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

function requireAuth(req, res, next) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ ok: false, code: "UNAUTHENTICATED", message: "Sign in required" });
  }

  getSupabaseAdmin()
    .from("admin_sessions")
    .select(`
      user_id,
      admin_users!inner (id, email, name, role, is_active)
    `)
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        clearSessionCookie(res);
        return res.status(401).json({ ok: false, code: "UNAUTHENTICATED", message: "Session expired" });
      }

      if (!data.admin_users?.is_active) {
        clearSessionCookie(res);
        return res.status(401).json({ ok: false, code: "UNAUTHENTICATED", message: "Account disabled" });
      }

      req.user = data.admin_users;
      next();
    })
    .catch((err) => {
      console.error("Auth error:", err);
      res.status(500).json({ ok: false, message: "Auth error" });
    });
}

function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !PERMISSIONS_REF[user.role]?.includes(permission)) {
      return res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    next();
  };
}

/* ---------- Products ---------- */

async function productSchema() {
  const [current, storage] = await Promise.all([hasProductMigration(), hasStoragePathColumns()]);
  return { current, storage };
}

function mapSpecEntries(record = {}) {
  return Object.entries(record).map(([key, values]) => ({
    key,
    value: (Array.isArray(values) ? values[0] : values) ?? "",
    unit: Array.isArray(values) ? values[1] ?? "" : "",
  }));
}

function mapPairEntries(record = {}) {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value.join(", ") : value,
  }));
}

/**
 * Technical tabs, performance table, materials and explanation paragraphs live
 * in their own tables and are read by product id. Each save rewrites them in
 * full, so the client always sends the complete technical object.
 */
async function loadTechnical(supabase, productId) {
  const empty = emptyTechnical();
  const dynamicTabs = await hasDynamicReviewTabs();
  const tabColumns = dynamicTabs
    ? "tab_key, label, is_custom, sort_order, enabled, heading, intro"
    : "tab_key, enabled, heading, intro";
  const [tabs, features, columns, rows, materials, paragraphs] = await Promise.all([
    supabase.from("product_review_tabs").select(tabColumns).eq("product_id", productId),
    supabase
      .from("product_review_features")
      .select("id, tab_key, label, detail, sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_performance_columns")
      .select("id, name, unit, sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase.from("product_performance_rows").select("id, sort_order").eq("product_id", productId).order("sort_order"),
    supabase
      .from("product_materials")
      .select("id, component, material, specification, sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_explanation_paragraphs")
      .select("id, html, sort_order")
      .eq("product_id", productId)
      .order("sort_order"),
  ]);

  // If technical tables don't exist (migration not run), return empty technical
  if (tabs.error && tabs.error.code === "42P01") return empty;
  for (const result of [tabs, features, columns, rows, materials, paragraphs]) {
    if (result.error && result.error.code !== "42P01") throw result.error;
  }

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

  const technical = empty;
  if (tabs.data?.length) technical.tabs = toTechnicalTabs(tabs.data);
  for (const feature of features.data ?? []) {
    const target = technical.tabs.find((item) => item.key === feature.tab_key);
    if (!target) continue;
    target.features.push({ label: feature.label ?? undefined, text: feature.detail });
  }
  technical.performance.columns = (columns.data ?? []).map((column) => ({
    id: column.id,
    name: column.name,
    unit: column.unit ?? "",
  }));
  technical.performance.rows = (rows.data ?? []).map((row) => {
    const rowCells = {};
    for (const cell of cells) {
      if (cell.row_id === row.id) rowCells[cell.column_id] = cell.value;
    }
    return { id: row.id, cells: rowCells };
  });
  technical.materials = (materials.data ?? []).map((item) => ({
    id: item.id,
    component: item.component,
    material: item.material,
    specification: item.specification ?? "",
  }));
  technical.paragraphs = (paragraphs.data ?? []).map((p) => ({ id: p.id, html: p.html }));

  return technical;
}

async function replaceTechnical(supabase, productId, input) {
  const technical = input ?? emptyTechnical();
  // Keep ids stable so the editor round-trips unchanged data without churn.
  const ids = (value) => (z.string().uuid().safeParse(value).success ? value : randomUUID());
  const tabKeys = new Set(technical.tabs.map((tab) => tab.key));
  const dynamicTabs = await hasDynamicReviewTabs();

  // Check if technical tables exist
  const { error: tablesExistError } = await supabase
    .from("product_review_tabs")
    .select("tab_key")
    .eq("product_id", productId)
    .limit(1);
  if (tablesExistError && tablesExistError.code === "42P01") {
    // Technical tables don't exist (migration not run), skip technical content handling
    return;
  }

  const { data: tabs, error: tabsError } = await supabase
    .from("product_review_tabs")
    .select(dynamicTabs ? "tab_key, label" : "tab_key")
    .eq("product_id", productId);
  if (tabsError) throw tabsError;

  for (const table of [
    "product_review_features",
    "product_review_tabs",
    "product_performance_cells",
    "product_performance_columns",
    "product_performance_rows",
    "product_materials",
    "product_explanation_paragraphs",
  ]) {
    let query = supabase.from(table).delete();
    if (table === "product_performance_cells") {
      const { data: productRows, error: rowError } = await supabase
        .from("product_performance_rows")
        .select("id")
        .eq("product_id", productId);
      if (rowError) throw rowError;
      const rowIds = (productRows ?? []).map((row) => row.id);
      if (!rowIds.length) continue;
      query = query.in("row_id", rowIds);
    } else {
      query = query.eq("product_id", productId);
    }
    const { error } = await query;
    if (error && error.code !== "42P01") throw error;
  }

  // Array order is the saved display order. Labels are stored verbatim (only
  // surrounding whitespace was trimmed by the schema). Each save rewrites every
  // tab, so a name the client did not send (an unnamed legacy tab) keeps the
  // one already stored instead of being cleared; a custom tab never falls back
  // to its key, which is a lowercased identifier rather than a name.
  const storedLabels = new Map(
    (tabs.data ?? []).map((tab) => [tab.tab_key, dynamicTabs ? (tab.label ?? "") : splitLegacyHeading(tab.heading).label]),
  );
  const tabRows = technical.tabs.map((tab, index) => {
    const standard = REVIEW_TAB_KEYS.includes(tab.key);
    const fallback = tab.label || (dynamicTabs ? storedLabels.get(tab.key) ?? "" : defaultTabLabel(tab.key));
    return {
      product_id: productId,
      tab_key: tab.key,
      enabled: tab.enabled,
      // Without the label column the editor's schema validator cannot allow the
      // marker, so the name is attached here rather than in the client payload.
      heading: dynamicTabs || standard ? tab.heading : headingWithLabel(tab.heading, fallback),
      intro: tab.intro,
      updated_at: new Date().toISOString(),
      ...(dynamicTabs ? { label: standard ? fallback || defaultTabLabel(tab.key) : fallback, is_custom: !standard, sort_order: index } : {}),
    };
  });
  if (tabRows.length) {
    const { error } = await supabase.from("product_review_tabs").insert(tabRows);
    if (error) throw error;
  }

  const featureRows = technical.tabs.flatMap((tab) =>
    tabKeys.has(tab.key)
      ? tab.features.map((feature, index) => ({
          id: randomUUID(),
          product_id: productId,
          tab_key: tab.key,
          label: feature.label ?? null,
          detail: feature.text,
          sort_order: index,
        }))
      : [],
  );
  if (featureRows.length) {
    const { error } = await supabase.from("product_review_features").insert(featureRows);
    if (error) throw error;
  }

  const columnIds = new Set(technical.performance.columns.map((column) => column.id));
  const columnRows = technical.performance.columns.map((column, index) => ({
    id: ids(column.id),
    product_id: productId,
    name: column.name,
    unit: column.unit,
    sort_order: index,
  }));
  if (columnRows.length) {
    const { error } = await supabase.from("product_performance_columns").insert(columnRows);
    if (error) throw error;
  }

  const rowRows = technical.performance.rows.map((row, index) => ({
    id: ids(row.id),
    product_id: productId,
    sort_order: index,
  }));
  if (rowRows.length) {
    const { error } = await supabase.from("product_performance_rows").insert(rowRows);
    if (error) throw error;
  }

  const cells = [];
  technical.performance.rows.forEach((row, rowIndex) => {
    for (const column of technical.performance.columns) {
      if (!columnIds.has(column.id)) continue;
      const value = row.cells[column.id];
      if (!value) continue;
      cells.push({ row_id: rowRows[rowIndex].id, column_id: ids(column.id), value });
    }
  });
  if (cells.length) {
    const { error } = await supabase.from("product_performance_cells").insert(cells);
    if (error) throw error;
  }

  const materialRows = technical.materials.map((item, index) => ({
    id: ids(item.id),
    product_id: productId,
    component: item.component,
    material: item.material,
    specification: item.specification,
    sort_order: index,
  }));
  if (materialRows.length) {
    const { error } = await supabase.from("product_materials").insert(materialRows);
    if (error) throw error;
  }

  const paragraphRows = technical.paragraphs.map((p, index) => ({
    id: ids(p.id),
    product_id: productId,
    html: p.html,
    sort_order: index,
  }));
  if (paragraphRows.length) {
    const { error } = await supabase.from("product_explanation_paragraphs").insert(paragraphRows);
    if (error) throw error;
  }
}

async function loadAdminProductRow(id) {
  const schema = await productSchema();
  let query = getSupabaseAdmin()
    .from("products")
    .select(`
      *,
      product_categories (slug, name)
    `)
    .eq("id", id);
  if (schema.current) query = query.is("deleted_at", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

function toAdminProduct(row, technical) {
  return {
    technical: technical ?? emptyTechnical(),
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    category: row.product_categories
      ? { slug: row.product_categories.slug, name: row.product_categories.name }
      : null,
    status: row.status,
    summary: row.summary ?? "",
    description: row.description ?? "",
    image: row.image_url,
    galleryImages: row.gallery_images ?? [],
    series: row.series ?? [],
    features: row.features ?? [],
    applications: row.applications ?? [],
    specifications: mapSpecEntries(row.specifications),
    materials: mapPairEntries(row.materials),
    datasheetUrl: row.datasheet_url,
    datasheetName: row.datasheet_name,
    catalogueUrl: row.catalogue_url ?? null,
    catalogueName: row.catalogue_name ?? null,
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    displayOrder: row.display_order ?? 0,
    imageStoragePath: row.image_storage_path ?? null,
    galleryStoragePaths: row.gallery_storage_paths ?? [],
    catalogueStoragePath: row.catalogue_storage_path ?? null,
    datasheetStoragePath: row.datasheet_storage_path ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The eight standard tabs every product starts with (display names live in the
// frontend's REVIEW_TABS); administrators can add custom tabs after these.
const REVIEW_TAB_KEYS = [
  "series",
  "operational",
  "installation",
  "advantages",
  "industry",
  "sector",
  "application",
  "measures",
];
const STANDARD_TAB_LABELS = {
  series: "Series",
  operational: "Operational",
  installation: "Installation",
  advantages: "Advantages",
  industry: "Industry",
  sector: "Sector",
  application: "Application",
  measures: "Measures",
};
// Generous ceiling; prevents accidentally enormous technical payloads.
const MAX_REVIEW_TABS = 40;
const TAB_KEY_PATTERN = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

function defaultTabLabel(key) {
  return STANDARD_TAB_LABELS[key] ?? key;
}

// Until the dynamic-tab migration adds product_review_tabs.label, a custom
// tab's name is carried in its heading row attribute. The heading text itself
// is unchanged: the marker is stripped before the heading reaches any page.
const LEGACY_LABEL_ATTRIBUTE = "data-tab-label";
const LEGACY_HEADING = new RegExp(`^<p ${LEGACY_LABEL_ATTRIBUTE}="([^"]*)">([\\s\\S]*)<\\/p>$`);
// Characters that would end or confuse the attribute; all are entity-escaped.
const LEGACY_LABEL_UNSAFE = /["<>&]/g;

function headingWithLabel(heading, label) {
  const escaped = (label ?? "").replace(LEGACY_LABEL_UNSAFE, (char) => `&#${char.charCodeAt(0)};`);
  return `<p ${LEGACY_LABEL_ATTRIBUTE}="${escaped}">${heading}</p>`;
}

/** Splits a stored legacy heading into its carried tab name and its text. */
function splitLegacyHeading(heading) {
  const match = LEGACY_HEADING.exec(heading ?? "");
  if (!match) return { label: "", heading };
  const label = match[1].replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return { label, heading: match[2] };
}

// Text left once markup (and entities such as &nbsp;) is removed; blank rich
// text does not count as tab content.
function plainText(html) {
  return (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tabHasContent(tab) {
  return tab.features.length > 0 || plainText(tab.intro).length > 0 || Boolean(tab.heading?.trim());
}

// Rich text is stored as sanitised HTML built from these tags only (see the
// admin editor). An allowlist here keeps stored markup safe regardless of client.
const RICH_TEXT_ALLOWED = {
  p: [],
  strong: [],
  em: [],
  ul: [],
  ol: [],
  li: [],
  br: [],
  h3: [],
};

const richTextSchema = z
  .string()
  .max(5000)
  .refine((value) => !/<\s*(script|style|iframe|object|embed|link|meta)\b/i.test(value), "Unsupported HTML in rich text")
  .refine((value) => !/\s(on\w+|style)\s*=/i.test(value), "Inline handlers and styles are not allowed")
  .refine((value) => !/href\s*=\s*["']?\s*(javascript|data):/i.test(value), "Unsafe link blocked")
  .refine(
    (value) => {
      for (const match of value.matchAll(/<\/?\s*([a-z0-9-]+)/gi)) {
        if (!Object.hasOwn(RICH_TEXT_ALLOWED, match[1].toLowerCase())) return false;
      }
      return true;
    },
    "Rich text contains unsupported tags",
  );

const featureSchema = z.object({
  label: z.string().trim().max(80).optional(),
  text: z.string().trim().min(1).max(500),
});

const reviewTabSchema = z.object({
  key: z.string().min(1).max(80).regex(TAB_KEY_PATTERN, "Invalid tab identifier"),
  label: z.string().trim().max(60).optional(),
  enabled: z.boolean(),
  heading: z.string().trim().max(120),
  intro: richTextSchema,
  features: z.array(featureSchema).max(60),
});

const performanceSchema = z.object({
  columns: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        unit: z.string().trim().max(80),
      }),
    )
    .max(24),
  rows: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        cells: z.record(z.string().max(64), z.string().max(300)),
      }),
    )
    .max(200),
});

const materialsSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      component: z.string().trim().min(1).max(120),
      material: z.string().trim().min(1).max(200),
      specification: z.string().trim().max(200),
    }),
  )
  .max(60);

const technicalSchema = z
  .object({
    tabs: z.array(reviewTabSchema).min(REVIEW_TAB_KEYS.length).max(MAX_REVIEW_TABS),
    performance: performanceSchema,
    materials: materialsSchema,
    paragraphs: z.array(z.object({ id: z.string().min(1).max(64), html: richTextSchema })).max(60),
  })
  .superRefine((value, ctx) => {
    const keys = new Set();
    const labels = new Set();
    value.tabs.forEach((tab, index) => {
      const at = { path: ["tabs", index] };
      if (keys.has(tab.key)) {
        ctx.addIssue({ code: "custom", message: `Duplicate tab identifier "${tab.key}"`, ...at });
        return;
      }
      keys.add(tab.key);
      const label = (tab.label || defaultTabLabel(tab.key)).toLowerCase();
      if (labels.has(label)) {
        ctx.addIssue({ code: "custom", message: `Duplicate tab name "${tab.label || defaultTabLabel(tab.key)}"`, ...at });
        return;
      }
      // A custom tab may be created empty and filled later, but every tab that
      // reaches the website must carry its own visible name.
      if (!REVIEW_TAB_KEYS.includes(tab.key) && !(tab.label ?? "").trim()) {
        ctx.addIssue({ code: "custom", message: "Custom tabs need a name", ...at });
      }
      if (tab.enabled && !tabHasContent(tab)) {
        ctx.addIssue({ code: "custom", message: `Tab "${tab.label || defaultTabLabel(tab.key)}" has no content yet; add content or hide it`, ...at });
      }
    });
  });

function emptyTechnical() {
  return {
    tabs: REVIEW_TAB_KEYS.map((key) => ({ key, label: defaultTabLabel(key), enabled: true, heading: "", intro: "", features: [] })),
    performance: { columns: [], rows: [] },
    materials: [],
    paragraphs: [],
  };
}

/**
 * Builds the tab list returned to the editor: the eight standard tabs first,
 * then custom tabs, all in the saved order. Rows saved before dynamic tabs
 * existed carry no label/order, so those fall back to the standard layout.
 *
 * `label` is returned exactly as stored. Custom tabs without a stored name
 * come back with an empty label instead of their identifier, so the editor
 * asks for a name rather than showing a lowercased key.
 */
function toTechnicalTabs(tabRows) {
  return tabRows
    .map((row) => {
      const standardIndex = REVIEW_TAB_KEYS.indexOf(row.tab_key);
      const custom = !row.is_custom && standardIndex !== -1 ? false : true;
      return {
        key: row.tab_key,
        label: custom ? (row.label ?? "") : row.label || defaultTabLabel(row.tab_key),
        isCustom: custom,
        sortOrder: custom ? (row.sort_order ?? REVIEW_TAB_KEYS.length) : (row.sort_order ?? standardIndex),
        enabled: row.enabled,
        heading: row.heading ?? "",
        intro: row.intro ?? "",
        features: [],
        // Rows from before the label column keep the custom tab's name in its
        // heading; report the plain heading so the editor gets the real text.
        ...(row.is_custom === undefined && custom
          ? (() => {
              const legacy = splitLegacyHeading(row.heading);
              return legacy.label
                ? { label: row.label || legacy.label, heading: legacy.heading }
                : {};
            })()
          : {}),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(2).max(80);
const storageUrlSchema = z.string().max(500);
const storagePathSchema = z.string().max(300).regex(/^products\/[0-9a-f-]{36}\/(images|documents)\/[a-z0-9-]+(?:\.[a-z0-9]+)?$/);


const specEntrySchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
  unit: z.string().trim().max(30).optional(),
});

const pairEntrySchema = z.object({
  key: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(300),
});

const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  categoryId: z.string().uuid().nullable(),
  summary: z.string().trim().max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  imageUrl: storageUrlSchema.nullable().optional(),
  galleryImages: z.array(storageUrlSchema).max(10).optional(),
  datasheetUrl: storageUrlSchema.nullable().optional(),
  datasheetName: z.string().max(150).nullable().optional(),
  catalogueUrl: storageUrlSchema.nullable().optional(),
  catalogueName: z.string().max(150).nullable().optional(),
  series: z.array(z.string().trim().min(1).max(300)).max(40).optional(),
  features: z.array(z.string().trim().min(1).max(300)).max(40).optional(),
  applications: z.array(z.string().trim().min(1).max(300)).max(40).optional(),
  specifications: z.array(specEntrySchema).max(40).optional(),
  materials: z.array(pairEntrySchema).max(40).optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDescription: z.string().trim().max(160).nullable().optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  status: z.enum(["draft", "published"]).optional(),
  imageStoragePath: storagePathSchema.nullable().optional(),
  galleryStoragePaths: z.array(storagePathSchema).max(10).optional(),
  catalogueStoragePath: storagePathSchema.nullable().optional(),
  datasheetStoragePath: storagePathSchema.nullable().optional(),
  technical: technicalSchema.optional(),
});

// A product may only be published once it has everything the public page needs.
function missingPublishFields(input) {
  const missing = [];
  if (!input.categoryId) missing.push("Category");
  if (!input.summary) missing.push("Short description");
  if (!input.imageUrl) missing.push("Main image");
  return missing;
}

// Category IDs are re-checked server-side; publishing also requires it to be active.
async function categoryProblem(categoryId, status) {
  if (!categoryId) return null;
  const migrated = await hasCategoryColumns();
  const { data, error } = await getSupabaseAdmin()
    .from("product_categories")
    .select(migrated ? "id, is_active" : "id")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { code: "VALIDATION", message: "The selected category no longer exists. Choose another category." };
  if (status === "published" && migrated && data.is_active === false) {
    return { code: "INCOMPLETE", message: "Cannot publish: the selected category is inactive. Choose an active category." };
  }
  return null;
}

function toSpecRecord(entries) {
  return Object.fromEntries(
    entries.map((entry) => [entry.key, entry.unit ? [entry.value, entry.unit] : [entry.value]]),
  );
}

function toMaterialRecord(entries) {
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.value]));
}

function toProductColumns(input, schema) {
  const columns = {
    slug: input.slug,
    name: input.name,
    category_id: input.categoryId,
    summary: input.summary || "",
    description: input.description || "",
    series: input.series || [],
    features: input.features || [],
    applications: input.applications || [],
    specifications: toSpecRecord(input.specifications || []),
    materials: toMaterialRecord(input.materials || []),
  };

  // image_url predates the migration, so it is always written. A partial update
  // that does not mention the image must not clear it, though.
  if (input.imageUrl !== undefined) columns.image_url = input.imageUrl || null;

  // Documents are not optional extras: if they are dropped the public download
  // silently 404s. Like the image, they are only touched when the update names
  // them, so an unrelated save never erases a catalogue. The url/name columns
  // predate the migration; storage-path columns are written only if they exist.
  const storage = schema.storage;
  if (input.catalogueUrl !== undefined) {
    const hasCatalogue = Boolean(input.catalogueUrl);
    columns.catalogue_url = input.catalogueUrl || null;
    columns.catalogue_name = hasCatalogue ? input.catalogueName || null : null;
    if (storage.catalogue) columns.catalogue_storage_path = storagePathFromReference(input.catalogueUrl, input.catalogueStoragePath);
  }
  if (input.datasheetUrl !== undefined) {
    const hasDatasheet = Boolean(input.datasheetUrl);
    columns.datasheet_url = input.datasheetUrl || null;
    columns.datasheet_name = hasDatasheet ? input.datasheetName || null : null;
    if (storage.datasheet) columns.datasheet_storage_path = storagePathFromReference(input.datasheetUrl, input.datasheetStoragePath);
  }
  if (storage.image) columns.image_storage_path = input.imageUrl !== undefined ? input.imageStoragePath || null : undefined;
  if (storage.gallery) columns.gallery_storage_paths = input.galleryImages ? input.galleryStoragePaths || [] : [];

  if (schema.current) {
    Object.assign(columns, {
      gallery_images: input.galleryImages || [],
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
      display_order: input.displayOrder ?? 0,
    });
  }

  return columns;
}

function sameOriginStorageUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const base = new URL(env.SUPABASE_URL);
    return parsed.origin === base.origin && parsed.pathname.startsWith("/storage/v1/object/public/product-uploads/");
  } catch {
    return false;
  }
}

// Private documents are stored as `private:<object key>` in the public
// `product-uploads` bucket and are only ever served through /api/files.
const PRIVATE_PREFIX = "private:";
const STORAGE_BUCKET = "product-uploads";

// Object keys are confined to a product's own folder; anything else (legacy
// `documents/<date>` keys, foreign URLs) is left untouched.
const STORAGE_KEY_PATTERN = /^products\/[0-9a-f-]{36}\/(images|documents)\/[a-z0-9-]+(?:\.[a-z0-9]+)?$/;

function isStorageKey(value) {
  return typeof value === "string" && value.length <= 300 && STORAGE_KEY_PATTERN.test(value);
}

function privateKey(url) {
  if (typeof url !== "string" || !url.startsWith(PRIVATE_PREFIX)) return null;
  const key = url.slice(PRIVATE_PREFIX.length);
  return isStorageKey(key) && key.includes("/documents/") ? key : null;
}

function isPrivateStorageUrl(url) {
  return privateKey(url) !== null;
}

function storageKeyFromUrl(url) {
  if (privateKey(url)) return privateKey(url);
  if (!sameOriginStorageUrl(url)) return null;
  return decodeURIComponent(new URL(url).pathname.split("/product-uploads/")[1] || "") || null;
}

// The client may send the document url without the storage path (older editors,
// merges from the admin row), so the url is authoritative when it names an object.
function storagePathFromReference(url, path) {
  return storageKeyFromUrl(url) ?? (isStorageKey(path) ? path : null);
}

// Admin-owned storage writes always run with the service-role key: the client
// has no user session, so Supabase Storage authorises each request with the
// service key's Bearer token and bypasses the bucket's (empty) RLS policies.
function getStorageClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const storageBucket = () => getStorageClient().storage.from(STORAGE_BUCKET);

// Uploads made through /uploads that have not been saved to a product yet, per
// product and slot. The whole API runs as one service account, so this is
// process-wide rather than per editor.
const pendingUploadRegistry = new Map();
const PENDING_UPLOAD_MS = 10 * 60 * 1000;

function pendingUploads(productId) {
  const slots = pendingUploadRegistry.get(productId) ?? new Map();
  for (const [slot, at] of slots) {
    if (Date.now() - at > PENDING_UPLOAD_MS) slots.delete(slot);
  }
  return slots;
}

function clearPendingUploads(productId) {
  pendingUploadRegistry.delete(productId);
}

async function removeStorageKeys(keys) {
  const unique = [...new Set(keys)].filter(isStorageKey);
  if (!unique.length) return;
  const { error } = await storageBucket().remove(unique);
  if (error) console.warn("[admin-products] storage cleanup failed:", error.message);
}

router.get("/products", requireAuth, async (req, res) => {
  try {
    const schema = await productSchema();
    let query = getSupabaseAdmin()
      .from("products")
      .select(`
        id, slug, name, category_id, status, summary, image_url, display_order:${schema.current ? "display_order" : "name"}, updated_at,
        product_categories (slug, name)
      `);
    if (schema.current) query = query.is("deleted_at", null);
    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) throw error;

    const products = (data ?? []).map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary ?? "",
      status: p.status,
      image: p.image_url,
      displayOrder: p.display_order ?? 0,
      category: p.product_categories ? { slug: p.product_categories.slug, name: p.product_categories.name } : null,
      updatedAt: p.updated_at,
    }));

    res.json({ ok: true, products });
  } catch (err) {
    console.error("GET /api/admin/products error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch products" });
  }
});

router.post("/products", requireAuth, requirePermission("products:write"), async (req, res) => {
  try {
    const parsed = productInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Invalid product data" });
    }

    const input = parsed.data;
    const status = input.status || "draft";
    if (status === "published") {
      const missing = missingPublishFields(input);
      if (missing.length) {
        return res.status(422).json({ ok: false, code: "INCOMPLETE", message: `Cannot publish yet. Missing: ${missing.join(", ")}.` });
      }
    }
    const invalidCategory = await categoryProblem(input.categoryId, status);
    if (invalidCategory) return res.status(422).json({ ok: false, ...invalidCategory });

    const schema = await productSchema();
    const { data, error } = await getSupabaseAdmin()
      .from("products")
      .insert({
        id: randomUUID(),
        ...toProductColumns(input, schema),
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ ok: false, code: "CONFLICT", message: "A product with this URL slug already exists." });
      throw error;
    }

    await replaceTechnical(getSupabaseAdmin(), data.id, input.technical);

    res.status(201).json({ ok: true, id: data.id, slug: data.slug });
  } catch (err) {
    console.error("POST /api/admin/products error:", err);
    res.status(500).json({ ok: false, message: "Failed to create product" });
  }
});

const patchSchema = z.union([
  z.object({ action: z.literal("update"), product: productInputSchema }),
  z.object({ action: z.literal("set-status"), status: z.enum(["draft", "published"]) }),
]);

router.get("/products/:id", requireAuth, async (req, res) => {
  try {
    const row = await loadAdminProductRow(req.params.id);
    if (!row) return res.status(404).json({ ok: false, code: "NOT_FOUND" });
    const technical = await loadTechnical(getSupabaseAdmin(), row.id);
    res.json({ ok: true, product: toAdminProduct(row, technical) });
  } catch (err) {
    console.error("GET /api/admin/products/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch product" });
  }
});

router.patch("/products/:id", requireAuth, requirePermission("products:write"), async (req, res) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Invalid data" });
    }

    const current = await loadAdminProductRow(req.params.id);
    if (!current) return res.status(404).json({ ok: false, code: "NOT_FOUND" });

    const schema = await productSchema();
    const supabase = getSupabaseAdmin();

    if (parsed.data.action === "set-status") {
      if (parsed.data.status === "published") {
        const missing = missingPublishFields({
          categoryId: current.category_id,
          summary: current.summary?.trim(),
          imageUrl: current.image_url,
        });
        if (missing.length) {
          return res.status(422).json({ ok: false, code: "INCOMPLETE", message: `Cannot publish yet. Missing: ${missing.join(", ")}.` });
        }
        const invalidCategory = await categoryProblem(current.category_id, "published");
        if (invalidCategory) return res.status(422).json({ ok: false, ...invalidCategory });
      }

      const { data, error } = await supabase
        .from("products")
        .update({
          status: parsed.data.status,
          published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .select("id, slug, status")
        .single();

      if (error) throw error;
      return res.json({ ok: true, ...data });
    }

    const input = parsed.data.product;
    const nextStatus = input.status ?? current.status;
    if (nextStatus === "published") {
      const missing = missingPublishFields(input);
      if (missing.length) {
        return res.status(422).json({ ok: false, code: "INCOMPLETE", message: `Cannot publish yet. Missing: ${missing.join(", ")}.` });
      }
    }
    const invalidCategory = await categoryProblem(input.categoryId, nextStatus);
    if (invalidCategory) return res.status(422).json({ ok: false, ...invalidCategory });

    const { data, error } = await supabase
      .from("products")
      .update({
        ...toProductColumns(input, schema),
        status: nextStatus,
        published_at:
          nextStatus !== "published"
            ? null
            : current.status === "published"
              ? current.published_at ?? undefined
              : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id)
      .select("id, slug")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ ok: false, code: "CONFLICT", message: "A product with this URL slug already exists." });
      throw error;
    }

    // Omitted technical content is left untouched (e.g. a status-only save).
    if (input.technical) await replaceTechnical(supabase, current.id, input.technical);

    // The editor saves right after each upload completes, so anything still
    // pending at this point belongs to a later upload and stays pending.
    clearPendingUploads(current.id);

    // Drop files the editor removed or replaced so storage does not accumulate
    // orphans.
    if (schema.storage.catalogue || schema.storage.datasheet || schema.storage.image || schema.storage.gallery) {
      const keyOf = (value) => storageKeyFromUrl(value) ?? (isStorageKey(value) ? value : null);
      const kept = new Set(
        [input.imageUrl, ...(input.galleryImages ?? []), input.datasheetUrl, input.catalogueUrl]
          .map(storageKeyFromUrl)
          .filter(Boolean),
      );
      // A file is orphaned only when the field that referenced it was part of
      // this update and no longer points at it. Fields the caller omitted (a
      // status-only save) or did not attach an upload to are left untouched.
      const pending = pendingUploads(current.id);
      const references = [
        { field: "catalogueUrl", keys: [current.catalogue_url, current.catalogue_storage_path], upload: "catalogue" },
        { field: "datasheetUrl", keys: [current.datasheet_url, current.datasheet_storage_path], upload: "datasheet" },
        { field: "imageUrl", keys: [current.image_url, current.image_storage_path], upload: "main" },
        { field: "galleryImages", keys: [...(current.gallery_images ?? []), ...(current.gallery_storage_paths ?? [])], upload: "gallery" },
      ];
      const orphans = [];
      for (const { field, keys, upload } of references) {
        const superseded = [...pending.keys()].some((slot) => slot.startsWith(upload));
        if (!(field in input) || superseded) continue;
        for (const key of keys.map(keyOf)) {
          if (key?.startsWith(`products/${current.id}/`) && !kept.has(key)) orphans.push(key);
        }
      }
      await removeStorageKeys(orphans);
    }

    res.json({ ok: true, id: data.id, slug: data.slug });
  } catch (err) {
    console.error("PATCH /api/admin/products/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to update product" });
  }
});

router.delete("/products/:id", requireAuth, requirePermission("products:write"), async (req, res) => {
  try {
    const current = await loadAdminProductRow(req.params.id);
    if (!current) return res.status(404).json({ ok: false, code: "NOT_FOUND" });

    const schema = await productSchema();
    const supabase = getSupabaseAdmin();
    const { error } = schema.current
      ? await supabase
          .from("products")
          .update({ deleted_at: new Date().toISOString(), status: "draft", published_at: null, updated_at: new Date().toISOString() })
          .eq("id", current.id)
      : await supabase.from("products").delete().eq("id", current.id);
    if (error) throw error;

    // The current schema keeps uploaded files so a soft-deleted row can be restored.
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/products/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to delete product" });
  }
});



const categoryFields = {
  name: z.string().trim().min(2).max(60),
  slug: slugSchema.max(60),
  description: z.string().trim().max(500).default(""),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
};

const categoryInputSchema = z.object(categoryFields);
const categoryPatchSchema = z.object(categoryFields).partial().refine((value) => Object.keys(value).length > 0, {
  message: "Nothing to update",
});

const CATEGORY_COLUMNS = "id, slug, name, description, parent_id, is_active, sort_order";
const LEGACY_CATEGORY_COLUMNS = "id, slug, name, sort_order";

// Rows read as active roots before the hierarchy migration has been applied.
function withCategoryDefaults(row) {
  return { ...row, description: "", parent_id: null, is_active: true };
}

function toCategory(row, productCount = 0, childIds = []) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    parentId: row.parent_id ?? null,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order ?? 0,
    productCount,
    childIds,
  };
}

// Products per category, so the UI can block deleting a category in use.
async function categoryUsage(supabase) {
  const counts = new Map();
  let query = supabase.from("products").select("category_id");
  if (await hasProductMigration()) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data ?? []) {
    if (row.category_id) counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }
  return counts;
}

async function loadCategoryRow(supabase, id) {
  const { data, error } = await supabase
    .from("product_categories")
    .select((await hasCategoryColumns()) ? CATEGORY_COLUMNS : LEGACY_CATEGORY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data && !("is_active" in data) ? withCategoryDefaults(data) : data;
}

// An active parent is required, so an active category never hides behind a
// deactivated one in the public menu. Nesting is one level deep.
async function resolveParent(supabase, parentId, categoryId) {
  if (!parentId) return { parentId: null };
  if (categoryId && parentId === categoryId) return { error: "A category cannot be its own parent." };

  const parent = await loadCategoryRow(supabase, parentId);
  if (!parent) return { error: "Parent category not found." };
  if (!parent.is_active) return { error: "The parent category is inactive." };
  if (parent.parent_id) return { error: "Categories can only be nested one level deep." };
  return { parentId };
}

async function hasChildren(supabase, id) {
  const { data, error } = await supabase.from("product_categories").select("id").eq("parent_id", id).limit(1);
  if (error) throw error;
  return Boolean(data?.length);
}

router.get("/categories", requireAuth, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const migrated = await hasCategoryColumns();
    const { data, error } = await supabase
      .from("product_categories")
      .select(migrated ? CATEGORY_COLUMNS : LEGACY_CATEGORY_COLUMNS)
      .order("sort_order")
      .order("name");
    if (error) throw error;

    const counts = await categoryUsage(supabase);
    const rows = (data ?? []).map((row) => (migrated ? row : withCategoryDefaults(row)));
    const childIds = new Map();
    for (const row of rows) {
      if (!row.parent_id) continue;
      childIds.set(row.parent_id, [...(childIds.get(row.parent_id) ?? []), row.id]);
    }

    res.json({
      ok: true,
      categories: rows.map((row) => toCategory(row, counts.get(row.id) ?? 0, childIds.get(row.id) ?? [])),
    });
  } catch (err) {
    console.error("GET /api/admin/categories error:", err);
    res.status(500).json({ ok: false, message: "Failed to fetch categories" });
  }
});

router.post("/categories", requireAuth, requirePermission("categories:write"), async (req, res) => {
  try {
    const parsed = categoryInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Enter a name of 2-60 characters and a valid URL slug." });
    }

    const supabase = getSupabaseAdmin();
    const parent = await resolveParent(supabase, parsed.data.parentId);
    if (parent.error) return res.status(422).json({ ok: false, code: "VALIDATION", message: parent.error });

    const migrated = await hasCategoryColumns();
    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        id: randomUUID(),
        name: parsed.data.name,
        slug: parsed.data.slug,
        sort_order: parsed.data.sortOrder ?? 0,
        ...(migrated
          ? { description: parsed.data.description, parent_id: parent.parentId, is_active: parsed.data.isActive ?? true }
          : {}),
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ ok: false, code: "CONFLICT", message: "A category with this URL slug already exists." });
      throw error;
    }

    res.status(201).json({ ok: true, id: data.id });
  } catch (err) {
    console.error("POST /api/admin/categories error:", err);
    res.status(500).json({ ok: false, message: "Failed to create category" });
  }
});

router.patch("/categories/:id", requireAuth, requirePermission("categories:write"), async (req, res) => {
  try {
    const parsed = categoryPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Invalid category data" });
    }

    const supabase = getSupabaseAdmin();
    const current = await loadCategoryRow(supabase, req.params.id);
    if (!current) return res.status(404).json({ ok: false, code: "NOT_FOUND", message: "Category not found" });

    const input = parsed.data;
    const migrated = await hasCategoryColumns();
    const update = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.sortOrder !== undefined) update.sort_order = input.sortOrder;
    if (migrated) {
      update.updated_at = new Date().toISOString();
      if (input.description !== undefined) update.description = input.description;
    }

    if (input.parentId !== undefined) {
      const parent = await resolveParent(supabase, input.parentId, current.id);
      if (parent.error) return res.status(422).json({ ok: false, code: "VALIDATION", message: parent.error });
      if (!parent.parentId && (await hasChildren(supabase, current.id))) {
        return res.status(422).json({ ok: false, code: "HAS_CHILDREN", message: "Move its sub-categories first." });
      }
      update.parent_id = parent.parentId;
    }

    if (input.isActive !== undefined) {
      if (input.isActive === false && (await hasChildren(supabase, current.id))) {
        return res.status(409).json({ ok: false, code: "HAS_CHILDREN", message: "Deactivate its sub-categories first." });
      }
      // Reactivating underneath an inactive parent would hide it again.
      if (input.isActive && current.parent_id) {
        const parent = await loadCategoryRow(supabase, current.parent_id);
        if (parent && !parent.is_active) {
          return res.status(409).json({ ok: false, code: "PARENT_INACTIVE", message: "Activate its parent category first." });
        }
      }
      update.is_active = input.isActive;
    }

    const { error } = await supabase.from("product_categories").update(update).eq("id", current.id);
    if (error) {
      if (error.code === "23505") return res.status(409).json({ ok: false, code: "CONFLICT", message: "A category with this URL slug already exists." });
      throw error;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/categories/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to update category" });
  }
});

router.delete("/categories/:id", requireAuth, requirePermission("categories:write"), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const counts = await categoryUsage(supabase);
    if (counts.get(req.params.id)) {
      return res.status(409).json({
        ok: false,
        code: "IN_USE",
        message: `This category has ${counts.get(req.params.id)} product(s). Move them to another category, or deactivate it instead.`,
      });
    }
    if (await hasChildren(supabase, req.params.id)) {
      return res.status(409).json({ ok: false, code: "HAS_CHILDREN", message: "Delete or move its sub-categories first." });
    }

    const { error } = await supabase.from("product_categories").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/categories/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to delete category" });
  }
});

const ADMIN_ROLES = ["superadmin", "product_manager", "read_only"];
const BCRYPT_ROUNDS = 12;

const newUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(80),
  role: z.enum(ADMIN_ROLES),
  password: z.string().min(12).max(200),
});

const patchUserSchema = z.object({
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(12).max(200).optional(),
});

router.get("/users", requireAuth, requirePermission("users:manage"), async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, name, role, is_active, last_login_at, created_at")
      .order("created_at");

    if (error) throw error;

    const members = (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at ?? null,
      createdAt: row.created_at,
    }));

    res.json({ ok: true, members });
  } catch (err) {
    console.error("GET /api/admin/users error:", err);
    res.status(500).json({ ok: false, message: "Failed to load team" });
  }
});

router.post("/users", requireAuth, requirePermission("users:manage"), async (req, res) => {
  try {
    const parsed = newUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Check the email, name, role and password (12+ characters)." });
    }

    const input = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", input.email);
    if (lookupError) throw lookupError;
    if (existing?.length) {
      return res.status(409).json({ ok: false, code: "CONFLICT", message: "An account with this email already exists." });
    }

    const { error } = await supabase.from("admin_users").insert({
      id: randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role,
      password_hash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    });
    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ ok: false, code: "CONFLICT", message: "An account with this email already exists." });
      }
      throw error;
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/users error:", err);
    res.status(500).json({ ok: false, message: "Failed to create account" });
  }
});

router.patch("/users/:id", requireAuth, requirePermission("users:manage"), async (req, res) => {
  try {
    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Invalid update." });
    }

    const patch = parsed.data;
    if (patch.role === undefined && patch.isActive === undefined && patch.password === undefined) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Nothing to update." });
    }

    const { id } = req.params;
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(404).json({ ok: false, code: "NOT_FOUND", message: "User not found." });
    }
    if (req.user.id === id) {
      return res.status(400).json({ ok: false, code: "INVALID", message: "You cannot change your own role, status or password here." });
    }

    const supabase = getSupabaseAdmin();
    const { data: target, error: findError } = await supabase
      .from("admin_users")
      .select("role, is_active")
      .eq("id", id)
      .single();

    if (findError) {
      if (findError.code === "PGRST116") return res.status(404).json({ ok: false, code: "NOT_FOUND", message: "User not found." });
      throw findError;
    }

    const demotingSuperadmin = target.role === "superadmin" && target.is_active &&
      ((patch.role && patch.role !== "superadmin") || patch.isActive === false);

    if (demotingSuperadmin) {
      const { count, error: countError } = await supabase
        .from("admin_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "superadmin")
        .eq("is_active", true);
      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return res.status(409).json({ ok: false, code: "CONFLICT", message: "At least one active Superadmin must remain." });
      }
    }

    const updates = { updated_at: new Date().toISOString() };
    if (patch.role) updates.role = patch.role;
    if (patch.isActive !== undefined) updates.is_active = patch.isActive;
    if (patch.password) updates.password_hash = await bcrypt.hash(patch.password, BCRYPT_ROUNDS);

    const { error: updateError } = await supabase.from("admin_users").update(updates).eq("id", id);
    if (updateError) throw updateError;

    await supabase.from("admin_sessions").delete().eq("user_id", id);

    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/admin/users/:id error:", err);
    res.status(500).json({ ok: false, message: "Failed to update account" });
  }
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

function detectFileType(buffer) {
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png", max: MAX_IMAGE_BYTES };
  }
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg", max: MAX_IMAGE_BYTES };
  }
  if (buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return { ext: "webp", mime: "image/webp", max: MAX_IMAGE_BYTES };
  }
  if (buffer.length > 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return { ext: "pdf", mime: "application/pdf", max: MAX_PDF_BYTES };
  }
  return null;
}

// Upload slots map onto the product's own storage folder:
// products/{productId}/images/{slot}-{id}.{ext} or .../documents/{slot}-{id}.pdf
const UPLOAD_SLOTS = {
  image: ["main", "gallery"],
  document: ["catalogue", "datasheet"],
};

router.post("/uploads", requireAuth, requirePermission("files:upload"), async (req, res) => {
  try {
    const formData = req.body;
    if (!formData || typeof formData !== "object") {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "No file provided." });
    }

    const { file: fileBase64, kind, slot = kind, productId } = formData;
    if (!fileBase64 || !UPLOAD_SLOTS[kind]?.includes(slot)) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "No file provided." });
    }
    if (!z.string().uuid().safeParse(productId).success) {
      return res.status(422).json({ ok: false, code: "VALIDATION", message: "Save the product before uploading files." });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_PDF_BYTES) {
      return res.status(422).json({ ok: false, code: "TOO_LARGE", message: "File is empty or too large." });
    }

    const detected = detectFileType(buffer);
    if (!detected) {
      return res.status(422).json({ ok: false, code: "UNSUPPORTED_TYPE", message: "Only JPG, PNG, WebP images or PDF documents are allowed." });
    }

    const isPdf = detected.mime === "application/pdf";
    if ((kind === "image" && isPdf) || (kind === "document" && !isPdf)) {
      return res.status(422).json({ ok: false, code: "UNSUPPORTED_TYPE", message: "The file type does not match the field." });
    }
    if (isPdf && !buffer.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
      return res.status(422).json({ ok: false, code: "UNSUPPORTED_TYPE", message: "The file is not a valid PDF." });
    }
    if (buffer.length > detected.max) {
      return res.status(422).json({
        ok: false,
        code: "TOO_LARGE",
        message: isPdf ? "PDFs must be 10 MB or smaller." : "Images must be 5 MB or smaller.",
      });
    }

    const key = `products/${productId}/${kind === "image" ? "images" : "documents"}/${slot}-${randomUUID()}.${detected.ext}`;
    const storage = storageBucket();
    const { error: uploadError } = await storage.upload(key, buffer, {
      contentType: detected.mime,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = storage.getPublicUrl(key);
    // PDFs are only handed out by the access-controlled proxy; images stay public.
    const url = isPdf ? `${PRIVATE_PREFIX}${key}` : urlData.publicUrl;

    if (!pendingUploadRegistry.has(productId)) pendingUploadRegistry.set(productId, new Map());
    pendingUploadRegistry.get(productId).set(slot, Date.now());

    res.status(201).json({
      ok: true,
      url,
      path: key,
      name: String(formData.name || "upload").slice(0, 150),
      size: buffer.length,
    });
  } catch (err) {
    console.error("POST /api/admin/uploads error:", err);
    res.status(500).json({ ok: false, message: "Upload failed" });
  }
});

export default router;