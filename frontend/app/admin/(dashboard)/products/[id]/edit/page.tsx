import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { hasPermission } from "@/lib/auth/roles";
import { getAdminCategoriesSafe, getAdminProductById } from "@/lib/products-server";
import ProductEditor, { type EditorProduct } from "@/components/admin/ProductEditor";
import CategoryLoadError from "@/components/admin/CategoryLoadError";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const instant = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!hasPermission(user.role, "products:write")) redirect("/admin");

  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [product, categoryResult] = await Promise.all([getAdminProductById(id), getAdminCategoriesSafe()]);
  if (!product) notFound();

  // Find main category from product's category
  let mainCategoryId = product.categoryId;
  let productTypeCategoryId = product.categoryId;

  if (product.categoryId) {
    const productTypeCat = categoryResult.categories.find((c) => c.id === product.categoryId);
    if (productTypeCat?.level === 1 && productTypeCat.mainCategoryId) {
      mainCategoryId = productTypeCat.mainCategoryId;
      productTypeCategoryId = product.categoryId;
    } else if (productTypeCat?.level === 0) {
      mainCategoryId = product.categoryId;
      productTypeCategoryId = "";
    }
  }

  const initial: EditorProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    categoryId: product.categoryId,
    mainCategoryId,
    productTypeCategoryId,
    status: product.status,
    summary: product.summary,
    description: product.description,
    imageUrl: product.image,
    galleryImages: product.galleryImages ?? [],
    datasheetUrl: product.datasheetUrl,
    datasheetName: product.datasheetName,
    catalogueUrl: product.catalogueUrl ?? null,
    catalogueName: product.catalogueName ?? null,
    modelUrl: product.modelUrl ?? null,
    modelName: product.modelName ?? null,
    series: product.series,
    features: product.features,
    applications: product.applications,
    specifications: product.specifications,
    materials: product.materials,
    seoTitle: product.seoTitle ?? null,
    seoDescription: product.seoDescription ?? null,
    displayOrder: product.displayOrder ?? 0,
    imageStoragePath: product.imageStoragePath ?? null,
    galleryStoragePaths: product.galleryStoragePaths ?? [],
    catalogueStoragePath: product.catalogueStoragePath ?? null,
    datasheetStoragePath: product.datasheetStoragePath ?? null,
    modelStoragePath: product.modelStoragePath ?? null,
    technical: product.technical,
    performanceMetrics: product.technical?.performanceMetrics ?? [],
  };

  return (
    <div>
      <AdminPageHeader title={product.name} description={`/products/${product.slug}`} role={user.role} />
      {categoryResult.error ? <CategoryLoadError message={categoryResult.error} /> : null}
      <ProductEditor
        key={product.updatedAt}
        categories={categoryResult.categories}
        categoriesError={categoryResult.error}
        product={initial}
      />
    </div>
  );
}
