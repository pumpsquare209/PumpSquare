import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Add it to frontend/.env.local before running this migration.");
  process.exit(1);
}

const target = new URL(connectionString);
console.log(
  `Target database: ${target.hostname}${target.pathname} (user ${decodeURIComponent(target.username)})`,
);

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const pool = new pg.Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "disable" || isLocal
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== "true" },
});

const PRODUCT_TYPE_RULES = [
  ["internal-lobe-pumps", /internal.{0,12}lobe|lobe.{0,12}internal/i],
  ["external-lobe-pumps", /external.{0,12}lobe|\blobe\b/i],
  ["internal-gear-pumps", /internal.{0,12}gear/i],
  ["external-gear-pumps", /external.{0,12}gear/i],
  ["progressive-cavity-pumps", /progressive.{0,12}cavity/i],
  ["triple-screw-pumps", /triple.{0,12}screw/i],
  ["twin-screw-pumps", /twin.{0,12}screw/i],
  ["shuttle-block-pumps", /shuttle.{0,12}block/i],
  ["trochoidal-gear-pumps", /trochoidal/i],
  ["gerotor-pumps", /gerotor/i],
  ["sectional-pumps", /sectional/i],
];

function resolveProductTypeSlug(product) {
  if (["seim-srl-pumps", "pumps-series"].includes(product.category_slug)) {
    return "seim-pumps-series";
  }

  const haystack = `${product.slug} ${product.name}`;
  for (const [slug, pattern] of PRODUCT_TYPE_RULES) {
    if (pattern.test(haystack)) return slug;
  }

  return null;
}

async function migrateCategories() {
  const client = await pool.connect();

  try {
    const { rows: beforeCategories } = await client.query(
      "select slug, name from product_categories order by sort_order, name",
    );
    const { rows: beforeProducts } = await client.query(
      "select count(*)::int as total from products",
    );
    console.log(
      `Before migration: ${beforeCategories.length} categories, ${beforeProducts[0].total} products`,
    );
    console.log("Existing category slugs:", beforeCategories.map((row) => row.slug).join(", "));

    const { rows: duplicateSlugs } = await client.query(
      "select slug, count(*)::int as count from product_categories group by slug having count(*) > 1",
    );
    if (duplicateSlugs.length) {
      throw new Error(`Duplicate category slugs found: ${duplicateSlugs.map((row) => row.slug).join(", ")}`);
    }

    const schema = await readFile(path.join(process.cwd(), "lib/db/schema.sql"), "utf8");
    const hierarchy = await readFile(path.join(process.cwd(), "lib/db/migration-3level-hierarchy.sql"), "utf8");

    await client.query("begin");
    await client.query(schema);
    await client.query(hierarchy);
    console.log("Hierarchy schema is up to date.");

    const { seedPumpsquareCategories } = await import("../lib/db/category-seed.mjs");
    const pumpsquareIds = await seedPumpsquareCategories(client);
    console.log(`Category seed applied (${pumpsquareIds.size} categories).`);

    await client.query(
      `update product_categories
       set is_active = false, updated_at = now()
       where level = 0
         and is_active
         and slug not in ('pumps-manufactured-by-us', 'pumps-traded-by-us')`,
    );

    const { rows: mainCategories } = await client.query(
      `select id, slug, name from product_categories
       where level = 0 and is_active = true
       order by sort_order, name`,
    );
    const mainSlugs = mainCategories.map((row) => row.slug);
    if (
      mainCategories.length !== 2 ||
      !mainSlugs.includes("pumps-manufactured-by-us") ||
      !mainSlugs.includes("pumps-traded-by-us")
    ) {
      throw new Error(`Expected exactly two active main categories, found: ${mainSlugs.join(", ") || "none"}`);
    }
    console.log("Active main categories:", mainCategories.map((row) => `${row.name} (${row.slug})`).join(" | "));

    const { rows: products } = await client.query(
      `select p.id, p.slug, p.name, p.category_id, c.slug as category_slug, c.name as category_name
       from products p
       left join product_categories c on p.category_id = c.id
       where p.deleted_at is null`,
    );

    const { rows: categoryRows } = await client.query(
      `select id, slug, main_category_id from product_categories where is_active = true`,
    );
    const categoryMap = new Map(categoryRows.map((row) => [row.slug, row]));

    let migrated = 0;
    let unchanged = 0;
    const manualReviewProducts = [];

    for (const product of products) {
      const targetSlug = resolveProductTypeSlug(product);
      const targetCategory = targetSlug ? categoryMap.get(targetSlug) : null;

      if (!targetCategory) {
        manualReviewProducts.push({
          slug: product.slug,
          name: product.name,
          oldCategory: product.category_name ?? null,
          reason: "No product-type category mapping found",
        });
        continue;
      }

      if (targetCategory.id === product.category_id) {
        unchanged++;
        continue;
      }

      await client.query(
        "update products set category_id = $1, updated_at = now() where id = $2",
        [targetCategory.id, product.id],
      );
      migrated++;
    }

    const { rows: afterMainCounts } = await client.query(
      `select mc.slug as main_slug, count(p.id)::int as product_count
       from product_categories mc
       left join product_categories pt on pt.main_category_id = mc.id and pt.is_active = true
       left join products p on p.category_id = pt.id and p.deleted_at is null
       where mc.level = 0 and mc.is_active = true
       group by mc.slug
       order by mc.slug`,
    );

    await client.query("commit");

    const report = {
      timestamp: new Date().toISOString(),
      target: `${target.hostname}${target.pathname}`,
      totalProducts: products.length,
      migrated,
      unchanged,
      needsManualReview: manualReviewProducts.length,
      mainCategories,
      productCountsByMainCategory: afterMainCounts,
      manualReviewProducts,
    };
    await writeFile(
      path.join(process.cwd(), "migration-report.json"),
      JSON.stringify(report, null, 2),
    );

    console.log("\n=== Migration Summary ===");
    console.log(`Products migrated: ${migrated}`);
    console.log(`Products already mapped: ${unchanged}`);
    console.log(`Products needing manual review: ${manualReviewProducts.length}`);
    console.log("Counts by main category:", afterMainCounts);
    console.log("Migration report saved to migration-report.json");
  } catch (error) {
    if (client.query) {
      await client.query("rollback").catch(() => {});
    }
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateCategories().catch(() => process.exit(1));
