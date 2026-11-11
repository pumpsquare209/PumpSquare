"use client";

import { RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OptimizedCanvas } from "../three/OptimizedCanvas";

const DESKTOP_MODEL_PATH = "/models/pumpsquare-pump.glb";
const MOBILE_MODEL_PATH = "/models/pumpsquare-pump-mobile-test.glb";
const FALLBACK_IMAGE = "/images/pumpsquare-pump-clean.png";

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0.1, 3.8);
const DEFAULT_MODEL_SCALE = 1.6;

export default function Pump3DViewer() {
  return (
    <OptimizedCanvas
      desktopModelPath={DESKTOP_MODEL_PATH}
      mobileModelPath={MOBILE_MODEL_PATH}
      defaultCameraPosition={DEFAULT_CAMERA_POSITION}
      defaultModelScale={DEFAULT_MODEL_SCALE}
      fallbackImage={FALLBACK_IMAGE}
      autoRotateSpeed={0.3}
      environmentPreset="studio"
      shadows={true}
      shadowMapSize={2048}
      labelTop={
        <div className="flex items-center gap-2">
          <span className="w-6 h-0.5 rounded bg-accent" style={{ backgroundColor: "#f5a623" }} />
          <span className="text-xs font-bold tracking-wider uppercase text-accent">
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