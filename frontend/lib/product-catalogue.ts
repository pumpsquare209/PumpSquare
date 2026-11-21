import "server-only";
import { seedProducts, type ProductSummary } from "@/lib/products";
import { getPublishedProductsResult } from "@/lib/products-server";

export async function getPublishedCatalogue(): Promise<ProductSummary[]> {
  const { products, error } = await getPublishedProductsResult();

  if (!error) {
    return products;
  }

  return seedProducts.map(({ slug, name, image, category }) => ({
    slug,
    name,
    image,
    category,
  }));
}
