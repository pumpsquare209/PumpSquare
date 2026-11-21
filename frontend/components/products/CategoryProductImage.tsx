"use client";

import { useState } from "react";
import type { ImageProps } from "next/image";
import ProductImage from "./ProductImage";

type CategoryProductImageProps = Omit<ImageProps, "alt" | "src" | "onError"> & {
  src?: string | null;
  alt?: string;
  fallbackLabel?: string;
};

export default function CategoryProductImage({
  src,
  alt = "",
  fallbackLabel = "Image coming soon",
  ...props
}: CategoryProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = src === failedSrc;

  if (!src || failed) {
    return (
      <div className="grid h-full w-full place-items-center bg-primary-soft/60 px-3 text-center text-xs font-medium text-muted">
        {fallbackLabel}
      </div>
    );
  }

  return <ProductImage {...props} src={src} alt={alt} onError={() => setFailedSrc(src)} />;
}
