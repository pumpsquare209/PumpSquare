"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";

const AboutPump3DViewerDynamic = dynamic(
  () => import("./AboutPump3DViewer").then((mod) => mod.default),
  {
    loading: () => (
      <div
        className="relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden flex items-center justify-center"
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

export default function AboutPump3DViewerWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for SSR hydration check
    setIsClient(true);
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

  return <AboutPump3DViewerDynamic />;
}