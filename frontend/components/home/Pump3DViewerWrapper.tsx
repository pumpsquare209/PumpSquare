"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PRELOAD_MARGIN = "600px 0px";

const Pump3DViewerDynamic = dynamic(
  () => import("./Pump3DViewer").then((mod) => mod.default),
  {
    loading: () => (
      <div
        className="relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div
          className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin"
        />
      </div>
    ),
    ssr: false,
  }
);

export default function Pump3DViewerWrapper() {
  const [isClient, setIsClient] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const node = placeholderRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isClient]);

  if (!isClient || !isNearViewport) {
    return (
      <div
        ref={placeholderRef}
        className="relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return <Pump3DViewerDynamic />;
}
