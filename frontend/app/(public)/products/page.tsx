import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { getCategoriesResult, getPublishedProductsResult } from "@/lib/products-server";
import CategoryProductImage from "@/components/products/CategoryProductImage";
import type { PublicCategory } from "@/lib/products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Browse Pumpsquare Systems LLP pumps and process equipment — progressive cavity, screw, gear and lobe pumps for industrial applications.",
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

const MAIN_CATEGORY_SLUGS = ["pumps-manufactured-by-us", "pumps-traded-by-us"] as const;

type ProductTypeCategory = PublicCategory & {
  productCount: number;
  imageUrl: string | null;
};

async function getProductsPageData() {
  const [categoryResult, productResult] = await Promise.all([
    getCategoriesResult(),
    getPublishedProductsResult(),
  ]);

  const categories = categoryResult.categories;
  const categoryError = categoryResult.error;
  const productError = productResult.error;

  const mainCategories = categories
    .filter(
      (category) =>
        category.level === 0 &&
        category.isActive !== false &&
        MAIN_CATEGORY_SLUGS.includes(category.slug as (typeof MAIN_CATEGORY_SLUGS)[number]),
    )
    .sort((a, b) => MAIN_CATEGORY_SLUGS.indexOf(a.slug as (typeof MAIN_CATEGORY_SLUGS)[number]) - MAIN_CATEGORY_SLUGS.indexOf(b.slug as (typeof MAIN_CATEGORY_SLUGS)[number]));

  const productCounts = new Map<string, number>();
  const productImages = new Map<string, string>();
  for (const product of productResult.products) {
    if (!product.category?.slug) continue;
    productCounts.set(product.category.slug, (productCounts.get(product.category.slug) ?? 0) + 1);
    if (product.image && !productImages.has(product.category.slug)) {
      productImages.set(product.category.slug, product.image);
    }
  }

  const mainCategoryData = mainCategories.map((mainCategory) => {
    const productTypeCategories = categories
      .filter(
        (category) =>
          category.level === 1 &&
          category.mainCategoryId === mainCategory.id &&
          category.isActive !== false,
      )
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
      .map((category) => ({
        ...category,
        productCount: productCounts.get(category.slug) ?? 0,
        imageUrl:
          category.categoryImageUrl ||
          productImages.get(category.slug) ||
          LOCAL_CATEGORY_IMAGES[category.slug] ||
          null,
      }));

    return {
      mainCategory,
      productTypeCategories,
    };
  });

  return {
    mainCategoryData,
    categoryError,
    productError,
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

function ProductsPageSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      {MAIN_CATEGORY_SLUGS.map((slug, idx) => (
        <section key={slug} className="bg-white py-14 sm:py-20" aria-labelledby={`main-category-heading-${idx}`}>
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
              <div className="mx-auto h-8 w-3/4 rounded bg-line/30" />
              <div className="mt-3 mx-auto h-4 w-full rounded bg-line/30" />
              <div className="mt-2 mx-auto h-4 w-2/3 rounded bg-line/30" />
            </div>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="aspect-[4/3] bg-primary-soft/60" />
                  <div className="p-5 sm:p-6">
                    <div className="h-3 w-2/3 rounded bg-line/30" />
                    <div className="mt-3 h-5 w-4/5 rounded bg-line/30" />
                    <div className="mt-3 h-4 w-full rounded bg-line/30" />
                    <div className="mt-2 h-4 w-5/6 rounded bg-line/30" />
                    <div className="mt-6 h-4 w-1/2 rounded bg-line/30" />
                  </div>
                </li>
              ))}
            </ul>
            {idx === 0 && <hr className="my-16 border-line/50" />}
          </div>
        </section>
      ))}
    </div>
  );
}

async function MainCategorySection({
  mainCategory,
  productTypeCategories,
  index,
}: {
  mainCategory: PublicCategory;
  productTypeCategories: ProductTypeCategory[];
  index: number;
}) {
  return (
    <section aria-labelledby={`main-category-heading-${index}`} className="bg-white py-14 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <h2
            id={`main-category-heading-${index}`}
            className="font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl"
          >
            {mainCategory.name}
          </h2>
          <span aria-hidden="true" className="mx-auto mt-3 block h-1 w-14 rounded-full bg-accent" />
          {mainCategory.description && (
            <p className="mt-4 text-lg text-muted">{mainCategory.description}</p>
          )}
        </div>

        {productTypeCategories.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
            {productTypeCategories.map((category) => (
              <ProductTypeCategoryCard key={category.id} category={category} />
            ))}
          </ul>
        ) : (
          <Notice>No product types are available in this category yet.</Notice>
        )}

        {index === 0 && <hr className="my-16 border-line/50" />}
      </div>
    </section>
  );
}

async function ProductsContent() {
  const { mainCategoryData, categoryError } = await getProductsPageData();

  if (categoryError) {
    return (
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Notice tone="error">We could not load product categories right now. Please try again shortly.</Notice>
        </div>
      </section>
    );
  }

  return (
    <>
      {mainCategoryData.map(({ mainCategory, productTypeCategories }, index) => (
        <MainCategorySection
          key={mainCategory.id}
          mainCategory={mainCategory}
          productTypeCategories={productTypeCategories}
          index={index}
        />
      ))}
    </>
  );
}

export default function ProductsPage() {
  return (
    <>
      <PageHero
        title="Our Products"
        description="Pumps and process equipment engineered for demanding industrial duties — browse by category or search the catalogue."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Products" }]}
        backgroundImage="/images/Precision Manufacturing Workshop Blueprint.png"
        imageAlt="Precision machined pump components on engineering drawings"
        imagePosition="object-[45%_58%] lg:object-[62%_center]"
        imageClassName="scale-[0.62] md:scale-[0.8] lg:scale-100"
        imageOverlay={{
          desktop:
            "linear-gradient(90deg,rgba(0,59,92,0.94)_0%,rgba(0,59,92,0.84)_34%,rgba(0,59,92,0.38)_70%,rgba(0,59,92,0.14)_100%)",
          mobile:
            "linear-gradient(160deg,rgba(0,59,92,0.94)_0%,rgba(0,59,92,0.84)_55%,rgba(0,59,92,0.58)_100%)",
        }}
      />

      <Suspense fallback={<ProductsPageSkeleton />}>
        <ProductsContent />
      </Suspense>
    </>
  );
}