import type { AdminCategory, PublicCategory } from "@/lib/products";

export function categoryText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(categoryText).filter(Boolean).join("\n");
  if (value === null || value === undefined || typeof value === "object") return "";
  return String(value);
}

export function normalizePublicCategory(category: PublicCategory): PublicCategory {
  return {
    ...category,
    name: categoryText(category.name),
    description: categoryText(category.description),
    content: categoryText(category.content),
    howItWorks: categoryText(category.howItWorks),
    applications: categoryText(category.applications),
    usageInfo: categoryText(category.usageInfo),
    industries: categoryText(category.industries),
    additionalInfo: categoryText(category.additionalInfo),
  };
}

export function normalizeAdminCategory(category: AdminCategory): AdminCategory {
  return {
    ...category,
    name: categoryText(category.name),
    description: categoryText(category.description),
    content: categoryText(category.content),
    howItWorks: categoryText(category.howItWorks),
    applications: categoryText(category.applications),
    usageInfo: categoryText(category.usageInfo),
    industries: categoryText(category.industries),
    additionalInfo: categoryText(category.additionalInfo),
  };
}
