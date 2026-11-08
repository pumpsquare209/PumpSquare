import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import type {
  AdminCategory,
  AdminProduct,
  AdminProductSummary,
  ProductDetail,
  ProductSummary,
  PublicCategory,
} from "@/lib/products";
import { withAbsoluteImages } from "@/lib/public-assets";

const BACKEND_URL = process.env.BACKEND_URL;

async function fetchBackend(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${BACKEND_URL}/api${path}`;

  let cookieHeader: string | undefined;
  try {
    const token = (await cookies()).get("psq_admin_session")?.value;
    if (token) cookieHeader = `psq_admin_session=${token}`;
  } catch {
    cookieHeader = undefined;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const getPublishedProduct = cache(async function getPublishedProduct(slug: string): Promise<ProductDetail | null> {
  try {
    const data = (await fetchBackend(`/products/${encodeURIComponent(slug)}`)) as { product?: ProductDetail };
    return data.product ? withAbsoluteImages(data.product) : null;
  } catch {
    return null;
  }
});

export const getPublishedProducts = cache(async function getPublishedProducts(): Promise<ProductSummary[]> {
  try {
    const data = (await fetchBackend("/products")) as { products?: ProductSummary[] };
    return (data.products ?? []).map(withAbsoluteImages);
  } catch {
    return [];
  }
});

export const getPublishedSlugs = cache(async function getPublishedSlugs(): Promise<string[]> {
  try {
    const data = (await fetchBackend("/products")) as { products?: ProductSummary[] };
    return (data.products ?? []).map((p) => p.slug);
  } catch {
    return [];
  }
});

export const getCategories = cache(async function getCategories(): Promise<PublicCategory[]> {
  try {
    const data = (await fetchBackend("/categories")) as { categories?: PublicCategory[] };
    return data.categories ?? [];
  } catch {
    return [];
  }
});

export async function listAdminProducts(): Promise<AdminProductSummary[]> {
  const data = (await fetchBackend("/admin/products")) as { products?: AdminProductSummary[] };
  return data.products ?? [];
}

export async function getAdminProductById(id: string): Promise<AdminProduct | null> {
  try {
    const data = (await fetchBackend(`/admin/products/${encodeURIComponent(id)}`)) as { product?: AdminProduct };
    return data.product ?? null;
  } catch {
    return null;
  }
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const data = (await fetchBackend("/admin/categories")) as { categories?: AdminCategory[] };
  return data.categories ?? [];
}

export async function getAdminCategoriesSafe(): Promise<{ categories: AdminCategory[]; error: string | null }> {
  try {
    return { categories: await getAdminCategories(), error: null };
  } catch (caught) {
    return { categories: [], error: caught instanceof Error ? caught.message : "Could not load categories." };
  }
}