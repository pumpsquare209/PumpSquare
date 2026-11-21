import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { categoryText } from "@/lib/category-content";
import { getCategoriesResult, getPublishedProductsResult } from "@/lib/products-server";
import PageHero from "@/components/ui/PageHero";
import FeaturedProductCarousel from "@/components/products/FeaturedProductCarousel";
import ProductRangeGrid from "@/components/products/ProductRangeGrid";
import CategoryInformation from "@/components/products/CategoryInformation";
import type { ProductSummary, PublicCategory } from "@/lib/products";

export const instant = false;

interface ProductTypeCategoryPageProps {
  params: Promise<{ productTypeSlug: string }>;
}

type ProductTypeCategoryData = {
  category: PublicCategory | null;
  mainCategory: PublicCategory | null;
  products: ProductSummary[];
  categoryError: string | null;
  productError: string | null;
};

async function getProductTypeCategoryData(productTypeSlug: string): Promise<ProductTypeCategoryData> {
  const [categoryResult, productResult] = await Promise.all([
    getCategoriesResult(),
    getPublishedProductsResult(),
  ]);

  const categories = categoryResult.categories;
  const category =
    categories.find(
      (item) =>
        item.slug === productTypeSlug &&
        (item.level === 1 || (item.level === undefined && Boolean(item.parentId))) &&
        item.isActive !== false,
    ) ?? null;

  if (!category) {
    return {
      category: null,
      mainCategory: null,
      products: [],
      categoryError: categoryResult.error,
      productError: productResult.error,
    };
  }

  const mainCategory =
    (category.mainCategoryId
      ? categories.find(
          (item) => item.id === category.mainCategoryId && item.level === 0 && item.isActive !== false,
        )
      : null) ??
    (category.parentId
      ? categories.find(
          (item) => item.id === category.parentId && item.level === 0 && item.isActive !== false,
        )
      : null) ??
    null;

  const products = productResult.products
    .filter((product) => product.category?.slug === category.slug)
    .sort(
      (a, b) =>
        (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name),
    );

  return {
    category,
    mainCategory,
    products,
    categoryError: categoryResult.error,
    productError: productResult.error,
  };
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border p-5 text-sm ${
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-line bg-white text-muted"
      }`}
    >
      {children}
    </div>
  );
}

function ProductTypeCategoryPageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="h-[30rem] bg-primary-deep" />
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <div className="mx-auto h-4 w-28 rounded bg-line/30" />
          <div className="mx-auto h-8 w-2/3 rounded bg-line/30" />
          <div className="mx-auto h-4 w-full rounded bg-line/30" />
        </div>
        <div className="mt-12 h-96 rounded-3xl bg-line/30" />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="aspect-[4/3] bg-primary-soft/60" />
              <div className="space-y-3 p-6">
                <div className="h-5 w-4/5 rounded bg-line/30" />
                <div className="h-4 w-full rounded bg-line/30" />
                <div className="h-4 w-2/3 rounded bg-line/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function ProductTypeCategoryContent({ params }: { params: Promise<{ productTypeSlug: string }> }) {
  const { productTypeSlug } = await params;
  const data = await getProductTypeCategoryData(productTypeSlug);

  if (data.categoryError) {
    return (
      <>
        <PageHero
          title="Products"
          description="Pumps and process equipment engineered for demanding industrial duties."
          breadcrumb={[{ label: "Home", href: "/" }, { label: "Products", href: "/products" }]}
          backgroundImage="/images/Precision Manufacturing Workshop Blueprint.png"
          imageAlt="Precision machined pump components on engineering drawings"
          imagePosition="object-[45%_58%] lg:object-[36%_center]"
          imageClassName="scale-[0.62] md:scale-[0.8] lg:scale-100"
          imageOverlay={{
            desktop:
              "linear-gradient(90deg,rgba(0,59,92,0.90)_0%,rgba(0,59,92,0.72)_45%,rgba(0,59,92,0.20)_100%)",
            mobile:
              "linear-gradient(160deg,rgba(0,59,92,0.92)_0%,rgba(0,59,92,0.82)_55%,rgba(0,59,92,0.55)_100%)",
          }}
        />
        <section className="bg-surface py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <Notice tone="error">We could not load product categories right now. Please try again shortly.</Notice>
          </div>
        </section>
      </>
    );
  }

  if (!data.category) notFound();

  const { category, mainCategory, products, productError } = data;
  const breadcrumb = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(mainCategory ? [{ label: mainCategory.name, href: `/products/category/${mainCategory.slug}` }] : []),
    { label: category.name },
  ];
  const description = categoryText(category.description).trim() || categoryText(category.content).trim();

  return (
    <>
      <PageHero
        title={category.name}
        description={description}
        breadcrumb={breadcrumb}
        backgroundImage="/images/Precision Manufacturing Workshop Blueprint.png"
        imageAlt="Precision machined pump components on engineering drawings"
        imagePosition="object-[45%_58%] lg:object-[36%_center]"
        imageClassName="scale-[0.62] md:scale-[0.8] lg:scale-100"
        imageOverlay={{
          desktop:
            "linear-gradient(90deg,rgba(0,59,92,0.90)_0%,rgba(0,59,92,0.72)_45%,rgba(0,59,92,0.20)_100%)",
          mobile:
            "linear-gradient(160deg,rgba(0,59,92,0.92)_0%,rgba(0,59,92,0.82)_55%,rgba(0,59,92,0.55)_100%)",
        }}
      />

      <section aria-labelledby="product-type-heading" className="bg-surface pt-12 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Product Type</p>
            <h2
              id="product-type-heading"
              className="mt-3 font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl"
            >
              {category.name}
            </h2>
            <span aria-hidden="true" className="mx-auto mt-4 block h-1 w-14 rounded-full bg-accent" />
            <p className="mt-4 text-base leading-relaxed text-muted">
              {description || `Browse the ${category.name} range and open a product for full technical details.`}
            </p>
            <p className="mt-3 text-sm font-semibold text-primary">
              {products.length} {products.length === 1 ? "product" : "products"} in this category
            </p>
          </div>

          {productError ? (
            <div className="mx-auto mt-8 max-w-3xl">
              <Notice tone="error">Product details are temporarily unavailable. Please try again shortly.</Notice>
            </div>
          ) : null}
        </div>
      </section>

      <FeaturedProductCarousel products={products} categoryName={category.name} />

      {products.length > 0 ? (
        <ProductRangeGrid products={products} />
      ) : (
        <section className="bg-surface pb-14 sm:pb-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <Notice>No products are available in this category yet.</Notice>
          </div>
        </section>
      )}

      <CategoryInformation category={category} mainCategory={mainCategory} />

      <section className="bg-white py-10">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
          >
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all product categories
          </Link>
        </div>
      </section>
    </>
  );
}

export async function generateMetadata({ params }: ProductTypeCategoryPageProps): Promise<Metadata> {
  const { productTypeSlug } = await params;
  const data = await getProductTypeCategoryData(productTypeSlug);
  if (!data.category) return { title: "Category Not Found" };

  const description =
    categoryText(data.category.description).trim() ||
    categoryText(data.category.content).trim() ||
    `Browse ${data.category.name} products.`;

  return {
    title: `${data.category.name} | Pumpsquare Systems LLP`,
    description: description.slice(0, 160),
  };
}

export default function ProductTypeCategoryPage({ params }: ProductTypeCategoryPageProps) {
  return (
    <Suspense fallback={<ProductTypeCategoryPageSkeleton />}>
      <ProductTypeCategoryContent params={params} />
    </Suspense>
  );
}
