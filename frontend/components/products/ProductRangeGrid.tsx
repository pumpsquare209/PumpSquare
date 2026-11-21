import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ProductSummary } from "@/lib/products";
import CategoryProductImage from "./CategoryProductImage";

export default function ProductRangeGrid({ products }: { products: ProductSummary[] }) {
  return (
    <section aria-labelledby="product-range-heading" className="bg-surface py-14 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Complete Range</p>
            <h2
              id="product-range-heading"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl"
            >
              Product Range
            </h2>
          </div>
          <p className="text-sm font-medium text-muted">
            {products.length} {products.length === 1 ? "product" : "products"} in this range
          </p>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <li key={product.slug} className="h-full">
              <Link
                href={`/products/${product.slug}`}
                prefetch
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_3px_rgba(0,59,92,0.06)] transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_36px_-18px_rgba(0,59,92,0.35)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-primary-soft/40">
                  <CategoryProductImage
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col border-t border-line p-5 sm:p-6">
                  <h3 className="font-display text-lg font-bold leading-snug text-primary-deep transition-colors group-hover:text-primary">
                    {product.name}
                  </h3>
                  {product.summary ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{product.summary}</p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-primary">
                    View Details
                    <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
