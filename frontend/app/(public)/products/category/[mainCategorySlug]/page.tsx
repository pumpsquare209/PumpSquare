import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getCategoriesResult, getPublishedProductsResult } from "@/lib/products-server";
import PageHero from "@/components/ui/PageHero";
import CategoryProductImage from "@/components/products/CategoryProductImage";
import type { PublicCategory } from "@/lib/products";

export const instant = false;

interface MainCategoryPageProps {
  params: Promise<{ mainCategorySlug: string }>;
}

type ProductTypeCategory = PublicCategory & {
  productCount: number;
  imageUrl: string | null;
};

type MainCategoryData = {
  mainCategory: PublicCategory | null;
  productTypeCategories: ProductTypeCategory[];
  categoryError: string | null;
  productError: string | null;
};

const LOCAL_CATEGORY_IMAGES: Record<string, string> = {
  "external-gear-pumps": "/images/products/external_gear_pumps_small.jpg",
  "external-lobe-pumps": "/images/products/external_lobe_pumps_small.jpg",
  "gerotor-pumps": "/images/products/gerotor_pumps_small.jpg",
  "internal-gear-pumps": "/images/products/internal_gear_pumps_small.jpg",
  "progressive-cavity-pumps": "/images/products/progressive_cavity_pumps_small.jpg",
  "shuttle-block-pumps": "/images/products/shuttle_block_pumps_small.jpg",
  "triple-screw-pumps": "/images/products/triple_screw_pumps_small.jpg",
  "trochoidal-gear-pumps": "/images/products/trochoidal_gear_pumps_small.jpg",
  "twin-screw-pumps": "/images/products/twin_screw_pumps_small.jpg",
};

async function getMainCategoryData(mainCategorySlug: string): Promise<MainCategoryData> {
  const [categoryResult, productResult] = await Promise.all([
    getCategoriesResult(),
    getPublishedProductsResult(),
  ]);

  const categories = categoryResult.categories;
  const mainCategory =
    categories.find(
      (category) =>
        category.slug === mainCategorySlug && category.level === 0 && category.isActive !== false,
    ) ?? null;

  if (!mainCategory) {
    return {
      mainCategory: null,
      productTypeCategories: [],
      categoryError: categoryResult.error,
      productError: productResult.error,
    };
  }

  const productTypeCategories = categories
    .filter(
      (category) =>
        category.level === 1 &&
        category.mainCategoryId === mainCategory.id &&
        category.isActive !== false,
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

  const productCounts = new Map<string, number>();
  const productImages = new Map<string, string>();
  for (const product of productResult.products) {
    if (!product.category?.slug) continue;
    productCounts.set(product.category.slug, (productCounts.get(product.category.slug) ?? 0) + 1);
    if (product.image && !productImages.has(product.category.slug)) {
      productImages.set(product.category.slug, product.image);
    }
  }

  return {
    mainCategory,
    productTypeCategories: productTypeCategories.map((category) => ({
      ...category,
      productCount: productCounts.get(category.slug) ?? 0,
      imageUrl:
        category.categoryImageUrl ||
        productImages.get(category.slug) ||
        LOCAL_CATEGORY_IMAGES[category.slug] ||
        null,
    })),
    categoryError: categoryResult.error,
    productError: productResult.error,
  };
}

function ProductTypeCategoryCard({ category }: { category: ProductTypeCategory }) {
  return (
    <li className="h-full">
      <Link
        href={`/products/type/${category.slug}`}
        prefetch
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(0,59,92,0.06)] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_32px_-14px_rgba(0,59,92,0.28)]"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft">
          <CategoryProductImage
            src={category.imageUrl}
            alt={`${category.name} pump`}
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
            className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
            fallbackLabel="Image coming soon"
          />
        </div>
        <div className="flex flex-1 flex-col border-t border-line p-5 sm:p-6">
          <p className="text-[11px] font-bold tracking-[0.16em] text-primary uppercase">{category.name}</p>
          <h3 className="mt-1.5 font-display text-lg leading-snug font-bold text-primary-deep transition-colors group-hover:text-primary">
            {category.name}
          </h3>
          <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-muted">
            {category.description}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-5">
            <span className="text-sm font-medium text-muted">
              {category.productCount} Product{category.productCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5">
              View Products
              <ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      className={`rounded-xl border p-5 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-line bg-white text-muted"
      }`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

function MainCategoryPageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="aspect-[4/3] bg-primary-soft/60" />
            <div className="p-5 sm:p-6">
              <div className="h-3 w-2/3 rounded bg-line/30" />
              <div className="mt-3 h-5 w-4/5 rounded bg-line/30" />
              <div className="mt-3 h-4 w-full rounded bg-line/30" />
              <div className="mt-2 h-4 w-5/6 rounded bg-line/30" />
              <div className="mt-6 h-4 w-1/2 rounded bg-line/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function MainCategoryContent({ mainCategorySlug }: { mainCategorySlug: string }) {
  const data = await getMainCategoryData(mainCategorySlug);

  if (data.categoryError) {
    return (
      <section className="bg-surface py-12 sm:py-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Notice tone="error">We could not load product categories right now. Please try again shortly.</Notice>
        </div>
      </section>
    );
  }

  if (!data.mainCategory) notFound();

  const { mainCategory, productTypeCategories, productError } = data;

  return (
    <section aria-labelledby="category-heading" className="bg-surface py-12 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="hover:text-primary transition-colors">Products</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-medium text-primary-deep" aria-current="page">{mainCategory.name}</li>
          </ol>
        </nav>

        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 id="category-heading" className="font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl">
            {mainCategory.name}
          </h1>
          <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-14 rounded-full bg-accent" />
          {mainCategory.description && (
            <p className="mt-4 text-lg text-muted">{mainCategory.description}</p>
          )}
        </div>

        {productError && (
          <div className="mb-6">
            <Notice tone="error">Product counts are temporarily unavailable, but you can still browse every product type.</Notice>
          </div>
        )}

        {productTypeCategories.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productTypeCategories.map((category) => (
              <ProductTypeCategoryCard key={category.id} category={category} />
            ))}
          </ul>
        ) : (
          <Notice>No product types are available in this category yet.</Notice>
        )}

        <div className="mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-deep"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all categories
          </Link>
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: MainCategoryPageProps): Promise<Metadata> {
  const { mainCategorySlug } = await params;
  const data = await getMainCategoryData(mainCategorySlug);
  if (!data.mainCategory) return { title: "Category Not Found" };

  return {
    title: `${data.mainCategory.name} | Pumpsquare Systems LLP`,
    description: data.mainCategory.description || `Browse ${data.mainCategory.name} product types.`,
  };
}

export default async function MainCategoryPage({ params }: MainCategoryPageProps) {
  const { mainCategorySlug } = await params;

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

      <Suspense fallback={<MainCategoryPageSkeleton />}>
        <MainCategoryContent mainCategorySlug={mainCategorySlug} />
      </Suspense>
    </>
  );
}
