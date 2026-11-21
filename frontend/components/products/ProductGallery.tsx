"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Image } from "lucide-react";
import ProductImage from "./ProductImage";
import { cn } from "@/lib/utils";

const Product3DModelViewer = dynamic(() => import("./Product3DModelViewer"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading 3D viewer…</div>,
});

/** Main image plus selectable thumbnails so additional images are reachable on the detail page. */
export default function ProductGallery({
  name,
  images,
  modelUrl,
  modelName,
}: {
  name: string;
  images: string[];
  modelUrl?: string | null;
  modelName?: string | null;
}) {
  const [selected, setSelected] = useState(0);
  const [viewMode, setViewMode] = useState<"images" | "3d">("images");
  const hasModel = Boolean(modelUrl);
  const active = images[Math.min(selected, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-primary/5">
        {viewMode === "3d" && hasModel ? (
          <Product3DModelViewer
            key={modelUrl}
            modelUrl={modelUrl!}
            modelName={modelName ?? "3D Model"}
            className="h-full w-full rounded-none border-0 shadow-none"
          />
        ) : (
          active ? (
            <ProductImage
              src={active}
              alt={selected === 0 ? name : `${name} view ${selected + 1}`}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              className="object-contain p-6 sm:p-8"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">Image coming soon</div>
          )
        )}
      </div>

      {/* View Mode Tabs */}
      {(images.length > 1 || hasModel) && (
        <div className="mt-4 flex gap-2 border-b border-line" role="tablist" aria-label="Product view modes">
          <button
            role="tab"
            aria-selected={viewMode === "images"}
            onClick={() => setViewMode("images")}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
              viewMode === "images"
                ? "border-accent text-primary"
                : "border-transparent text-muted hover:text-primary-deep"
            )}
          >
            <Image className="size-4" aria-hidden="true" />
            Images
          </button>
          {hasModel && (
            <button
              role="tab"
              aria-selected={viewMode === "3d"}
              onClick={() => setViewMode("3d")}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
                viewMode === "3d"
                  ? "border-accent text-primary"
                  : "border-transparent text-muted hover:text-primary-deep"
              )}
            >
              <Box className="size-4" aria-hidden="true" />
              3D Model
            </button>
          )}
        </div>
      )}

      {/* Image Thumbnails */}
      {viewMode === "images" && images.length > 1 && (
        <ul className="mt-4 grid grid-cols-5 gap-2 sm:gap-3" aria-label="Product images">
          {images.map((src, index) => (
            <li key={`${src}-${index}`}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={index === 0 ? "Show main image" : `Show image ${index + 1}`}
                aria-pressed={index === selected}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-white transition-colors",
                  index === selected ? "border-accent" : "border-line hover:border-steel",
                )}
              >
                <ProductImage src={src} alt="" fill sizes="15vw" className="object-contain p-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}