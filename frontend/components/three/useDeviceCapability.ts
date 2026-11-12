"use client";

import { useEffect, useState, useCallback } from "react";

export type DeviceTier = "mobile" | "tablet" | "desktop";

interface DeviceCapability {
  tier: DeviceTier;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  webglSupported: boolean;
  dpr: number;
  isClient: boolean;
}

const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;

function getTierFromWidth(width: number): DeviceTier {
  if (width < MOBILE_MAX_WIDTH) return "mobile";
  if (width < TABLET_MAX_WIDTH) return "tablet";
  return "desktop";
}

function getDPR(tier: DeviceTier, rawDPR: number): number {
  switch (tier) {
    case "mobile":
      // Phones rarely resolve more than this; keeps the drawing buffer small.
      return Math.max(1, Math.min(rawDPR, 1.25));
    case "tablet":
      return Math.min(rawDPR, 1.25);
    case "desktop":
      return Math.min(rawDPR, 1.5);
  }
}

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    tier: "desktop",
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    prefersReducedMotion: false,
    webglSupported: false,
    dpr: 1,
    isClient: false,
  });

  const updateCapability = useCallback(() => {
    if (typeof window === "undefined") return;

    const width = window.innerWidth;
    const tier = getTierFromWidth(width);
    const rawDPR = window.devicePixelRatio || 1;
    const dpr = getDPR(tier, rawDPR);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let webglSupported = false;
    try {
      const probe = window.WebGLRenderingContext
        ? (document.createElement("canvas").getContext("webgl") as WebGLRenderingContext | null)
        : null;
      webglSupported = !!probe;
      // Release the probe context immediately; browsers cap simultaneous WebGL contexts.
      probe?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupported = false;
    }

    setCapability({
      tier,
      isMobile: tier === "mobile",
      isTablet: tier === "tablet",
      isDesktop: tier === "desktop",
      prefersReducedMotion,
      webglSupported,
      dpr,
      isClient: true,
    });
  }, []);

  useEffect(() => {
    setCapability((prev) => ({ ...prev, isClient: true }));
    updateCapability();

    const handleResize = () => updateCapability();
    window.addEventListener("resize", handleResize, { passive: true });

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => updateCapability();
    mediaQuery.addEventListener?.("change", handleMotionChange);

    return () => {
      window.removeEventListener("resize", handleResize);
      mediaQuery.removeEventListener?.("change", handleMotionChange);
    };
  }, [updateCapability]);

  return capability;
}

/**
 * Only two resolutions exist, but tier is resolved once per canvas mount so a
 * window resize cannot make the loaded model URL change (and re-request).
 */
export function getModelPath(
  tier: DeviceTier,
  desktopPath: string,
  mobilePath: string
): string {
  return tier === "desktop" ? desktopPath : mobilePath;
}