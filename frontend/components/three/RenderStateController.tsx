"use client";

import { useEffect } from "react";
import { useStore } from "@react-three/fiber";

// Read every frame by the animation callbacks; lives outside a single context so
// the controller and the useFrame loops do not need to share a tree position.
const renderState = { paused: false };

export function setRenderPaused(paused: boolean) {
  renderState.paused = paused;
}

export function isRenderPaused() {
  return renderState.paused;
}

/**
 * Drives the R3F frameloop from a prop. Configuring the store directly (instead of
 * through <Canvas frameloop>) re-applies on every toggle even when an unrelated
 * canvas prop re-runs the root configuration.
 */
export function RenderStateController({ active }: { active: boolean }) {
  const store = useStore();

  useEffect(() => {
    const state = store.getState();
    setRenderPaused(!active);
    if (active) {
      state.setFrameloop("always");
      state.invalidate();
    } else {
      state.setFrameloop("never");
    }
    return () => setRenderPaused(false);
  }, [active, store]);

  return null;
}
