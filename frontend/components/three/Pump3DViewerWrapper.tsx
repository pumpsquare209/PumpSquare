"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const Pump3DViewerDynamic = dynamic(
  () => import("./Pump3DViewer").then((mod) => mod.default),
  {
    loading: () => (
      <div
        className="relative aspect-[4/3] overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

export default function Pump3DViewerWrapper({ showLabels = true, autoRotateSpeed = 1.2 }: { showLabels?: boolean; autoRotateSpeed?: number }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for SSR hydration check
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className="relative aspect-[4/3] overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return <Pump3DViewerDynamic showLabels={showLabels} autoRotateSpeed={autoRotateSpeed} />;
}