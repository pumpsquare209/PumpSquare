import "server-only";

type WithImage = { image?: string | null };

/**
 * Image URLs are made absolute here: the admin runs on the backend origin, but
 * `next/image` resolves relative sources against this app (and rejects URLs
 * carrying admin query strings). Documents are left for fileProxyUrl so drafts
 * stay unreachable.
 */
export function withAbsoluteImages<T extends WithImage>(product: T): T {
  const image = product.image;
  if (!image || /^https?:\/\//i.test(image)) return product;
  try {
    const baseUrl = process.env.BACKEND_URL;
    if (!baseUrl) return product;
    return { ...product, image: new URL(image, baseUrl).toString() };
  } catch {
    return product;
  }
}
