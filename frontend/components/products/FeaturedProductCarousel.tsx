"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ProductSummary } from "@/lib/products";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import CategoryProductImage from "./CategoryProductImage";

const AUTOPLAY_MS = 4500;
const MAX_SLIDES = 6;

export default function FeaturedProductCarousel({
  products,
  categoryName,
}: {
  products: ProductSummary[];
  categoryName: string;
}) {
  const featured = useMemo(() => products.slice(0, MAX_SLIDES), [products]);
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = featured.length;

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActive(((index % count) + count) % count);
      setRestartKey((value) => value + 1);
    },
    [count],
  );

  useEffect(() => {
    const handleVisibility = () => setDocumentHidden(document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (count < 2 || reduceMotion || hovered || focused || documentHidden) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, count, documentHidden, focused, hovered, reduceMotion, restartKey]);

  if (count === 0) return null;

  return (
    <section aria-labelledby="featured-products-heading" className="bg-white py-14 sm:py-16">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">Featured Range</p>
            <h2
              id="featured-products-heading"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl"
            >
              Featured {categoryName}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            Explore representative models from this pump type. Open any product for specifications and documentation.
          </p>
        </div>

        <div
          ref={rootRef}
          className="relative overflow-hidden rounded-3xl border border-line bg-primary-soft/30 shadow-[0_24px_50px_-32px_rgba(0,59,92,0.45)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goTo(active - 1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goTo(active + 1);
            }
          }}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label={`Featured ${categoryName}`}
        >
          <div className="relative min-h-[22rem] sm:min-h-[26rem] lg:min-h-[30rem]">
            {featured.map((product, index) => (
              <div
                key={product.slug}
                className={cn(
                  "absolute inset-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
                  index === active
                    ? "translate-x-0 opacity-100"
                    : index < active
                      ? "-translate-x-6 opacity-0"
                      : "translate-x-6 opacity-0",
                )}
                aria-hidden={index !== active}
              >
                <Link
                  href={`/products/${product.slug}`}
                  tabIndex={index === active ? 0 : -1}
                  className="group grid h-full w-full grid-cols-1 bg-white lg:grid-cols-2"
                >
                  <div className="relative min-h-64 overflow-hidden bg-primary-soft lg:min-h-full">
                    <CategoryProductImage
                      src={product.image}
                      alt={product.name}
                      fill
                      priority={index === 0}
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-contain p-8 transition-transform duration-500 group-hover:scale-105 sm:p-12"
                    />
                  </div>
                  <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
                    <p className="text-sm font-semibold text-primary">{product.category?.name ?? categoryName}</p>
                    <h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-primary-deep sm:text-4xl">
                      {product.name}
                    </h3>
                    {product.summary ? (
                      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">{product.summary}</p>
                    ) : null}
                    <span className="mt-8 inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors group-hover:bg-primary-deep">
                      View Product Details
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => goTo(active - 1)}
                aria-label="Previous featured product"
                className="absolute top-1/2 left-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/95 text-primary-deep shadow-lg transition-colors hover:bg-white"
              >
                <ArrowLeft aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                aria-label="Next featured product"
                className="absolute top-1/2 right-3 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white/95 text-primary-deep shadow-lg transition-colors hover:bg-white"
              >
                <ArrowRight aria-hidden="true" className="size-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-2 shadow-md">
                {featured.map((product, index) => (
                  <button
                    key={product.slug}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Show featured product ${index + 1}: ${product.name}`}
                    aria-current={index === active}
                    className={cn(
                      "size-2.5 rounded-full transition-all",
                      index === active ? "w-6 bg-primary" : "bg-steel hover:bg-primary",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
