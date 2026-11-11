"use client";

import { RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OptimizedCanvas } from "./OptimizedCanvas";

const DESKTOP_MODEL_PATH = "/models/homelastsection.glb";
const MOBILE_MODEL_PATH = "/models/homelastsection-mobile-test.glb";
const FALLBACK_IMAGE = "/images/Industrial_Blue_Pump_Assembly-removebg-preview.png";

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0.1, 3.5);
const DEFAULT_MODEL_SCALE = 2.2;

interface Pump3DViewerProps {
  showLabels?: boolean;
  autoRotateSpeed?: number;
}

export default function Pump3DViewer({ showLabels = true, autoRotateSpeed = 1.2 }: Pump3DViewerProps) {
  return (
    <OptimizedCanvas
      desktopModelPath={DESKTOP_MODEL_PATH}
      mobileModelPath={MOBILE_MODEL_PATH}
      defaultCameraPosition={DEFAULT_CAMERA_POSITION}
      defaultModelScale={DEFAULT_MODEL_SCALE}
      fallbackImage={FALLBACK_IMAGE}
      autoRotateSpeed={autoRotateSpeed}
      environmentPreset="studio"
      shadows={true}
      shadowMapSize={2048}
      showLabels={showLabels}
      labelTop={
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 rounded bg-accent" />
          <span className="text-xs font-bold tracking-wider uppercase text-primary">
            INTERACTIVE 3D SHOWCASE
          </span>
        </div>
      }
      labelBottom={
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-ink/70" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">360° View</span>
        </div>
      }
    />
  );
}