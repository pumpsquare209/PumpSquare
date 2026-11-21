import {
  PUMPSQUARE_CATEGORIES as categoryDefinitions,
  seedPumpsquareCategories as seedCategories,
} from "./category-seed.mjs";

export type PumpsquareCategory = {
  slug: string;
  name: string;
  parent: string | null;
  level: 0 | 1;
  description: string;
  categoryImageUrl: string | null;
};

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: { id: string }[] }>;
};

export const PUMPSQUARE_CATEGORIES = categoryDefinitions as readonly PumpsquareCategory[];

export const seedPumpsquareCategories: (
  client: Queryable,
) => Promise<Map<string, string>> = seedCategories;
