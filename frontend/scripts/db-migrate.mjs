import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const pool = new pg.Pool({
  connectionString,
  ssl:
    process.env.DATABASE_SSL === "disable" || isLocal
      ? false
      : { rejectUnauthorized: process.env.DATABASE_SSL_NO_VERIFY !== "true" },
});

const schema = await readFile(path.join(process.cwd(), "lib/db/schema.sql"), "utf8");
await pool.query(schema);
console.log("Schema is up to date.");

const { seedPumpsquareCategories } = await import("../lib/db/category-seed.mjs");
const { seedCategories, seedProducts } = await import("../lib/products.ts");

const client = await pool.connect();
try {
  await client.query("begin");
  // Always ensure the Pumpsquare categories exist; existing rows are reused.
  const pumpsquareIds = await seedPumpsquareCategories(client);

  if (process.argv.includes("--seed")) {
    // Legacy demo data is opt-in and only attached to categories it introduces.
    const categoryIds = new Map(pumpsquareIds);
    for (const [index, category] of seedCategories.entries()) {
      if (categoryIds.has(category.slug)) continue;
      const { rows } = await client.query(
        `insert into product_categories (id, name, slug, sort_order, level)
         values ($1, $2, $3, $4, 1)
         on conflict (slug) do update set name = excluded.name
         returning id`,
        [randomUUID(), category.name, category.slug, pumpsquareIds.size + index],
      );
      categoryIds.set(category.slug, rows[0].id);
    }

    for (const product of seedProducts) {
      await client.query(
        `insert into products (
           id, slug, name, category_id, status, summary, description, image_url,
           datasheet_url, datasheet_name, series, features, applications,
           specifications, materials, published_at
         ) values ($1,$2,$3,$4,'published',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
         on conflict (slug) do nothing`,
        [
          randomUUID(),
          product.slug,
          product.name,
          product.category ? categoryIds.get(product.category.slug) : null,
          product.summary,
          product.description,
          product.image,
          product.datasheetUrl,
          product.datasheetName,
          product.series,
          product.features,
          product.applications,
          JSON.stringify(product.specifications),
          JSON.stringify(product.materials),
        ],
      );
    }

    console.log(`Seeded ${seedCategories.length} legacy categories and ${seedProducts.length} products (existing rows kept).`);
  }

  await client.query("commit");
  console.log("Pumpsquare categories are up to date.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
}

await pool.end();
