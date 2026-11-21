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

// Apply only the category section (idempotent) so the seed works without a full migrate.
const schema = await readFile(path.join(process.cwd(), "lib/db/schema.sql"), "utf8");
const start = schema.indexOf("create table if not exists product_categories");
const end = schema.indexOf("create table if not exists products");
if (start < 0 || end < 0) throw new Error("Category section not found in lib/db/schema.sql");

const { seedPumpsquareCategories, PUMPSQUARE_CATEGORIES } = await import("../lib/db/category-seed.mjs");

const client = await pool.connect();
try {
  await client.query("begin");
  await client.query(schema.slice(start, end));
  await seedPumpsquareCategories(client);
  await client.query("commit");
  console.log(`Category seed applied (${PUMPSQUARE_CATEGORIES.length} categories, existing rows reused by slug).`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
