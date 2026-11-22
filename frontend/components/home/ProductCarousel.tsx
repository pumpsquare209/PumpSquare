"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductSummary } from "@/lib/products";
import ProductImage from "@/components/products/ProductImage";
import { cn } from "@/lib/utils";

const CARD_WIDTH = 280;
const GAP = 24;
const ANIMATION_SPEED = 0.5;

export default function ProductCarousel({ products }: { products: ProductSummary[] }) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const singleSetWidthRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setPaused(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      singleSetWidthRef.current = products.length * (CARD_WIDTH + GAP);
    }
  }, [products.length]);

  const animate = (timestamp: number) => {
    if (paused || reducedMotion) {
      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (lastTimeRef.current === null) {
      lastTimeRef.current = timestamp;
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const distance = ANIMATION_SPEED * deltaTime;
    offsetRef.current -= distance;

    if (offsetRef.current <= -singleSetWidthRef.current) {
      offsetRef.current += singleSetWidthRef.current;
    }

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${offsetRef.current}px)`;
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (reducedMotion) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (trackRef.current) {
        trackRef.current.style.transform = "translateX(0)";
      }
      offsetRef.current = 0;
      lastTimeRef.current = null;
      return;
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [paused, reducedMotion, products.length]);

  const handleMouseEnter = () => {
    if (!reducedMotion) setPaused(true);
  };

  const handleMouseLeave = () => {
    if (!reducedMotion) setPaused(false);
  };

  const handleTouchStart = () => {
    if (!reducedMotion) setPaused(true);
  };

  const handleTouchEnd = () => {
    if (!reducedMotion) setPaused(false);
  };

  const duplicatedProducts = [...products, ...products, ...products, ...products];

  return (
    <section aria-label="Top Products" className="bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-[1450px] px-4 sm:px-6 lg:px-8">
        {/* Centered heading group */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-accent flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">
                TOP PRODUCTS
              </p>
            </div>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-extrabold leading-[1.1] tracking-tight text-primary-deep">
              Pumps We Manufacture
            </h2>
            <span aria-hidden="true" className="mt-3 block h-1 w-16 rounded-full bg-accent mx-auto" />
            <p className="mt-6 text-base leading-relaxed text-muted max-w-2xl mx-auto">
              A selection from the complete range of positive displacement pumps produced at our facility.
            </p>
          </div>
        </div>

        {/* Full-width carousel viewport */}
        <div
          ref={carouselRef}
          className="relative mt-14 overflow-hidden"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={trackRef}
            className="flex gap-6"
            style={{
              width: "max-content",
              willChange: "transform",
            }}
          >
            {duplicatedProducts.map((product, index) => (
              <Link
                key={`${product.slug}-${index}`}
                href={`/products/${product.slug}`}
                className={cn(
                  "flex-shrink-0 relative flex flex-col overflow-hidden rounded-[16px] border border-line bg-white shadow-sm transition-all duration-300",
                  "hover:-translate-y-1 hover:border-accent hover:shadow-[0_12px_30px_rgba(255,209,0,0.25)]"
                )}
                style={{ width: `${CARD_WIDTH}px` }}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  <div
                    aria-hidden="true"
                    className="absolute top-0 right-0 left-0 z-10 h-1.5 bg-accent"
                  />
                  {product.image ? (
                    <ProductImage
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="280px"
                      className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <h3 className="text-sm font-semibold leading-snug text-ink sm:text-base">
                    {product.name}
                  </h3>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-accent transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-110"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}