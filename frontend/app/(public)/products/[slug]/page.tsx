import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, Download, FileText } from "lucide-react";
import { getPublishedProduct } from "@/lib/products-server";
import { fileProxyUrl } from "@/lib/upload-url";
import ProductGallery from "@/components/products/ProductGallery";
import TechnicalTabsWrapper from "@/components/products/TechnicalTabsWrapper";
import PageHero from "@/components/ui/PageHero";

// Product data is read live from the backend; opt this segment out of the
// instant/prerender requirement until the fetch is wrapped in `use cache`.
export const instant = false;

interface ProductDetailProps {
  params: Promise<{ slug: string }>;
}

function specValue(values: string[]) {
  const [value, unit] = values;
  if (!value) return "";
  return unit ? `${value} ${unit}` : value;
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface animate-pulse" aria-hidden="true">
      <section className="relative isolate overflow-hidden bg-primary-deep min-h-[40vh]">
        <div className="absolute inset-0 bg-primary-deep" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,59,92,0.95)_0%,rgba(0,59,92,0.85)_25%,rgba(0,59,92,0.55)_50%,rgba(0,59,92,0.25)_75%,rgba(0,59,92,0.05)_100%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-36 sm:px-6 sm:pb-20 sm:pt-40 lg:px-8">
          <nav aria-label="Breadcrumb" className="animate-rise">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <li><div className="h-4 w-12 rounded bg-white/30" /></li>
              <li aria-hidden="true"><div className="h-4 w-2 rounded bg-white/30" /></li>
              <li><div className="h-4 w-16 rounded bg-white/30" /></li>
              <li aria-hidden="true"><div className="h-4 w-2 rounded bg-white/30" /></li>
              <li className="font-medium text-white"><div className="h-5 w-32 rounded bg-white/30" /></li>
            </ol>
          </nav>
          <div className="animate-rise mt-6" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
            <div className="h-10 w-3/4 rounded bg-white/30" />
          </div>
          <div className="animate-rise mt-3 block h-1 w-16 rounded-full bg-accent" style={{ "--reveal-delay": "150ms" } as React.CSSProperties} />
          <div className="animate-rise mt-6 max-w-2xl text-lg leading-[1.6] text-primary-soft" style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
            <div className="h-6 w-full rounded bg-white/30" />
            <div className="mt-2 h-6 w-5/6 rounded bg-white/30" />
          </div>
        </div>
      </section>

      <nav aria-label="Breadcrumb" className="border-b border-line bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li><div className="h-4 w-12 rounded bg-line/60" /></li>
            <li aria-hidden="true"><div className="h-4 w-2 rounded bg-line/60" /></li>
            <li><div className="h-4 w-16 rounded bg-line/60" /></li>
            <li aria-hidden="true"><div className="h-4 w-2 rounded bg-line/60" /></li>
            <li><div className="h-4 w-20 rounded bg-line/60" /></li>
            <li aria-hidden="true"><div className="h-4 w-2 rounded bg-line/60" /></li>
            <li className="font-medium text-primary"><div className="h-5 w-32 rounded bg-line/60" /></li>
          </ol>
        </div>
      </nav>

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-primary/5">
                <div className="absolute inset-0 bg-line/30" />
              </div>
              <div className="mt-6 h-12 w-48 rounded-lg bg-line/50" />
            </div>

            <div className="lg:pt-4 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-1 w-10 flex-shrink-0 rounded-full bg-line/60" />
                <div className="h-5 w-24 rounded-full bg-line/60" />
              </div>
              <div className="h-10 w-3/4 rounded bg-line/60" />
              <div className="h-1 w-16 rounded-full bg-line/60" />
              <div className="h-6 w-full rounded bg-line/60" />
              <div className="h-6 w-5/6 rounded bg-line/60" />
              <div className="h-6 w-4/5 rounded bg-line/60" />

              <div className="flex flex-wrap gap-3">
                <div className="h-11 w-36 rounded-lg bg-line/60" />
                <div className="h-11 w-40 rounded-lg bg-line/60" />
              </div>

              <div className="h-6 w-1/3 rounded bg-line/60" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 w-full rounded-lg border border-line bg-white" />
                ))}
              </div>

              <div className="h-6 w-1/3 rounded bg-line/60" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 w-full rounded-lg border border-line bg-white" />
                ))}
              </div>

              <div className="h-6 w-1/3 rounded bg-line/60" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 w-full rounded-lg border border-line bg-white" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div className="flex items-center gap-3">
              <div className="h-1 w-10 flex-shrink-0 rounded-full bg-line/60" />
              <div className="h-7 w-40 rounded bg-line/60" />
            </div>
            <div className="mt-5 rounded-2xl border border-line bg-white shadow-sm">
              <div className="h-12 border-b border-line bg-primary-soft/40" />
              <div className="p-5 sm:p-8 space-y-6">
                <div className="h-6 w-1/3 rounded bg-line/60" />
                <div className="h-4 w-full rounded bg-line/60" />
                <div className="h-4 w-5/6 rounded bg-line/60" />
                <div className="h-24 w-full rounded-xl border border-line bg-line/50" />
                <div className="h-24 w-full rounded-xl border border-line bg-line/50" />
                <div className="h-16 w-full rounded-xl bg-surface" />
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-line bg-primary p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="h-7 w-1/2 rounded bg-white/30" />
                <div className="mt-2 h-4 w-3/4 rounded bg-white/30" />
              </div>
              <div className="h-11 w-36 rounded-lg bg-white/30" />
            </div>
          </div>

          <div className="mt-8 h-6 w-24 rounded bg-line/60" />
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: ProductDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return { title: "Product Not Found" };

  const title = product.seoTitle?.trim() || product.name;
  const description = (product.seoDescription?.trim() || product.summary || product.description).slice(0, 160);
  const image = product.image ? fileProxyUrl(product.image) : null;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Pumpsquare Systems LLP`,
      description,
      type: "website",
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail slug={slug} />
    </Suspense>
  );
}

async function ProductDetail({ slug }: { slug: string }) {
  const product = await getPublishedProduct(slug);

  if (!product) notFound();

  const gallery = [product.image, ...(product.galleryImages ?? [])]
    .filter((src): src is string => Boolean(src))
    .map((src) => fileProxyUrl(src) ?? src);
  // Catalogue PDFs are served straight from Supabase Storage's public URL.
  const catalogueHref = product.catalogueAvailable === false ? null : product.catalogueUrl ?? null;
  const datasheetHref = fileProxyUrl(product.datasheetUrl, true);
  const hasTechnicalTabs = (product.technical?.tabs ?? []).some((tab) => tab.enabled && tab.features.length > 0);
  const quoteHref = `/contact?product=${encodeURIComponent(product.slug)}`;
  const modelUrl = product.modelUrl ? fileProxyUrl(product.modelUrl) : null;
  const modelName = product.modelName;

  return (
    <div className="min-h-screen bg-surface">
      <PageHero
        title={product.name}
        description={product.summary}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Products", href: "/products" }, { label: product.name }]}
        backgroundImage="/images/Industrial Blue Rotary Pump on Factory Skid.png"
        imageAlt="Industrial blue rotary pump on factory skid"
        imagePosition="object-center"
        imageClassName=""
        imageOverlay={{
          desktop:
            "linear-gradient(90deg,rgba(0,59,92,0.95)_0%,rgba(0,59,92,0.85)_25%,rgba(0,59,92,0.55)_50%,rgba(0,59,92,0.25)_75%,rgba(0,59,92,0.05)_100%)",
          mobile:
            "linear-gradient(160deg,rgba(0,59,92,0.95)_0%,rgba(0,59,92,0.85)_30%,rgba(0,59,92,0.65)_60%,rgba(0,59,92,0.4)_100%)",
        }}
      />

      <nav aria-label="Breadcrumb" className="border-b border-line bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-4 py-4 sm:px-6 lg:px-8">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/products" className="transition-colors hover:text-primary">Products</Link>
            </li>
            {product.category ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/products/type/${product.category.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li className="font-medium text-primary" aria-current="page">{product.name}</li>
          </ol>
        </div>
      </nav>

      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <ProductGallery
                name={product.name}
                images={gallery}
                modelUrl={modelUrl}
                modelName={modelName}
              />

              {datasheetHref ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={datasheetHref}
                    className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-accent/50 hover:bg-primary-soft"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    <span>{product.datasheetName || "Technical Datasheet"}</span>
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                </div>
              ) : null}
            </div>

            <div className="lg:pt-4">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="h-1 w-10 flex-shrink-0 rounded-full bg-accent" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                  {product.category?.name ?? "Product"}
                </p>
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-primary-deep sm:text-4xl lg:text-5xl">
                {product.name}
              </h1>
              <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-accent" />
              <p className="mt-6 text-lg leading-[1.8] text-muted">
                {product.summary}
              </p>
              {product.description && product.description !== product.summary ? (
                <p className="mt-4 whitespace-pre-line text-base leading-[1.8] text-muted">
                  {product.description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={quoteHref}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-bold text-primary-deep transition-colors hover:bg-accent-dark"
                >
                  Request a Quote
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                {catalogueHref ? (
                  <a
                    href={catalogueHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-7 py-3.5 font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    <BookOpen className="size-4" aria-hidden="true" />
                    Download Catalogue
                  </a>
                ) : null}
              </div>

              {product.series.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-display text-lg font-bold text-primary-deep">Available Series</h2>
                  <ul className="mt-4 space-y-3">
                    {product.series.map((series) => (
                      <li key={series} className="flex items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-sm transition-colors hover:border-accent/40">
                        <Check className="size-5 shrink-0 text-accent" aria-hidden="true" />
                        <span className="font-medium text-ink">{series}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.features.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-display text-lg font-bold text-primary-deep">Key Features</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {product.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
                        <Check className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                        <span className="text-muted">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {product.applications.length > 0 && (
                <div className="mt-10">
                  <h2 className="font-display text-lg font-bold text-primary-deep">Applications</h2>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.applications.map((app) => (
                      <span key={app} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent/40 hover:bg-primary-soft">
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!hasTechnicalTabs && Object.keys(product.specifications).length > 0 && (
                <div className="mt-10">
                  <h2 className="font-display text-lg font-bold text-primary-deep">Specifications</h2>
                  <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
                    <dl className="divide-y divide-line">
                      {Object.entries(product.specifications).map(([key, values]) => (
                        <div key={key} className="grid grid-cols-[1fr_2fr] px-5 py-4 transition-colors hover:bg-primary-soft/30">
                          <dt className="font-medium text-muted">{key}</dt>
                          <dd className="text-ink">{specValue(values)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}

              {!hasTechnicalTabs && Object.keys(product.materials).length > 0 && (
                <div className="mt-10">
                  <h2 className="font-display text-lg font-bold text-primary-deep">Materials of Construction</h2>
                  <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
                    <dl className="divide-y divide-line">
                      {Object.entries(product.materials).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[1fr_2fr] px-5 py-4 transition-colors hover:bg-primary-soft/30">
                          <dt className="font-medium text-muted">{key}</dt>
                          <dd className="text-ink">{Array.isArray(value) ? value.join(", ") : value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          </div>

          <TechnicalTabsWrapper technical={product.technical} />

          <div className="mt-12 rounded-2xl border border-line bg-primary p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-white">
                  Need More Information?
                </h2>
                <p className="mt-2 text-primary-soft">
                  Contact our technical team for detailed specifications, pricing, and application support.
                </p>
              </div>
              <Link
                href={quoteHref}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-7 py-3.5 font-semibold text-primary-deep transition-colors hover:bg-accent-dark"
              >
                Request a Quote
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-deep"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All products
          </Link>
        </div>
      </section>
    </div>
  );
}
