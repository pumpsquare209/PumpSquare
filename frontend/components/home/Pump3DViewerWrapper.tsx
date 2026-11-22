"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

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

interface Pump3DViewerWrapperProps {
  showLabels?: boolean;
  autoRotateSpeed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Pump3DViewerWrapper({
  showLabels = true,
  autoRotateSpeed = 1.2,
  className = "",
  style,
}: Pump3DViewerWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsClient(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isClient) {
    return (
      <div
        className="relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Pump3DViewerDynamic
      showLabels={showLabels}
      autoRotateSpeed={autoRotateSpeed}
      className={className}
      style={style}
    />
  );
}