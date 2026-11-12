"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Isolates failures inside the R3F scene tree (e.g. an environment map that
 * fails to load) so the rest of the viewer keeps rendering instead of blanking.
 */
export class CanvasErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[3D viewer] scene component failed:", error.message);
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
