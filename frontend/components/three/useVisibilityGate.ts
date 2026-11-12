"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface VisibilityGateOptions {
  /** IntersectionObserver rootMargin applied around the observed element. */
  rootMargin: string;
  /** Distance from the viewport at which the WebGL canvas is created. */
  mountMargin: string;
}

/**
 * Tracks three independent gates used by the 3D viewers:
 * - `isMounted`: element is close enough to the viewport that a canvas may be created.
 * - `isInViewport`: element actually intersects the viewport (drives rendering).
 * - `isTabVisible`: the browser tab is visible and focused (drives rendering).
 */
export function useVisibilityGate<T extends Element>(
  ref: RefObject<T | null>,
  { rootMargin, mountMargin }: VisibilityGateOptions
) {
  const [isMounted, setIsMounted] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const isMountedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      isMountedRef.current = true;
      setIsMounted(true);
      setIsInViewport(true);
      return;
    }

    let hasReportedInViewport = false;
    let isNearViewport = false;

    const mountObserver = new IntersectionObserver(
      (entries) => {
        const near = entries.some((entry) => entry.isIntersecting);
        isNearViewport = near;
        if (near && !isMountedRef.current) {
          isMountedRef.current = true;
          setIsMounted(true);
        } else if (!near && hasReportedInViewport) {
          // Surface swapped away from the viewport: release the canvas entirely.
          isMountedRef.current = false;
          setIsMounted(false);
        }
      },
      { rootMargin: mountMargin, threshold: 0 }
    );

    const viewObserver = new IntersectionObserver(
      (entries) => {
        if (!isNearViewport) return;
        const intersecting = entries.some((entry) => entry.isIntersecting);
        hasReportedInViewport = intersecting;
        setIsInViewport(intersecting);
      },
      { rootMargin, threshold: 0 }
    );

    mountObserver.observe(node);
    viewObserver.observe(node);

    return () => {
      mountObserver.disconnect();
      viewObserver.disconnect();
    };
  }, [ref, rootMargin, mountMargin]);

  useEffect(() => {
    const update = () => setIsTabVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return { isMounted, isInViewport, isTabVisible };
}
