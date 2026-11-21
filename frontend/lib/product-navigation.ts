import { productMenu } from "@/lib/content";
import type { PublicCategory } from "@/lib/products";

export type ProductNavItem = {
  slug: string;
  label: string;
  description: string;
  href: string;
  icon: "factory" | "package";
  childSlugs: string[];
};

export function getProductNavItems(categories: PublicCategory[]): ProductNavItem[] {
  return productMenu.map((item) => {
    const category = categories.find(
      (entry) => entry.slug === item.slug && entry.level === 0 && entry.isActive !== false,
    );
    const childSlugs = categories
      .filter(
        (entry) =>
          entry.level === 1 &&
          (entry.mainCategoryId === category?.id || entry.parentId === category?.id),
      )
      .map((entry) => entry.slug);

    return {
      slug: item.slug,
      label: category?.name?.trim() || item.label,
      description: item.description,
      href: category ? `/products/category/${category.slug}` : item.href,
      icon: item.icon,
      childSlugs,
    };
  });
}

export function isProductsSection(pathname: string | null | undefined): boolean {
  return pathname === "/products" || pathname?.startsWith("/products/") === true;
}

export function isProductNavItemActive(
  item: ProductNavItem,
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false;
  return (
    pathname === item.href ||
    item.childSlugs.some((slug) => pathname === `/products/type/${slug}`)
  );
}
