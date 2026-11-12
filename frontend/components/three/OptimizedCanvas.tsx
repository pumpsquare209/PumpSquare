import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { PumpModel, PumpModelProps } from "./PumpModel";
import { useDeviceCapability, type DeviceTier } from "./useDeviceCapability";
import { useVisibilityGate } from "./useVisibilityGate";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { RenderStateController, isRenderPaused } from "./RenderStateController";

type EnvironmentPreset = "studio" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "sunset" | "warehouse";

// Bundled copies of drei's presets; keeps the HDR on our own origin and cacheable.
const LOCAL_ENVIRONMENT_ASSETS: Partial<Record<EnvironmentPreset, string[]>> = {
  studio: ["/hdri/studio_small_03_1k.hdr"],
};
const ENVIRONMENT_FALLBACK_FILES = ["/hdri/fallback/studio_small_03_fallback.hdr"];

interface OptimizedCanvasProps extends Omit<PumpModelProps, "onLoad" | "onError" | "tier"> {
  showLabels?: boolean;
  autoRotateSpeed?: number;
  fallbackImage: string;
  labelTop?: React.ReactNode;
  labelBottom?: React.ReactNode;
  environmentPreset?: EnvironmentPreset;
  shadows?: boolean;
  shadowMapSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RENDER_MARGIN = "400px";
const MOUNT_MARGIN = "400px 0px";
const USER_INTERACTION_RESUME_MS = 1500;

const rotateAxis = new THREE.Vector3(0, 1, 0);
const lookDirection = new THREE.Vector3();

function getShadowMapSize(tier: DeviceTier, requested: number): number {
  switch (tier) {
    case "mobile":
      return 512;
    case "tablet":
      return 1024;
    default:
      return Math.min(requested, 1024);
  }
}

function AutoRotateController({
  enabled,
  rotationSpeed = 0.3,
  userInteractingRef,
}: {
  enabled: boolean;
  rotationSpeed?: number;
  userInteractingRef: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!enabled || userInteractingRef.current || isRenderPaused()) return;

    camera.getWorldDirection(lookDirection);
    camera.position.applyAxisAngle(rotateAxis, rotationSpeed * delta);
    camera.lookAt(lookDirection);
  });

  return null;
}

function ViewerEnvironment({ preset }: { preset: EnvironmentPreset }) {
  // Trying the bundled asset first and falling back to a second local copy keeps the
  // viewer lit even if the primary HDR is unavailable; without either, the existing
  // light rig still renders the model.
  const [attempt, setAttempt] = useState(0);
  const files = LOCAL_ENVIRONMENT_ASSETS[preset] ? (attempt === 0 ? LOCAL_ENVIRONMENT_ASSETS[preset] : ENVIRONMENT_FALLBACK_FILES) : undefined;

  return (
    <CanvasErrorBoundary
      onError={
        files === ENVIRONMENT_FALLBACK_FILES ? undefined : () => setAttempt((value) => value + 1)
      }
    >
      {files ? (
        <Environment files={files} background={false} backgroundBlurriness={0} />
      ) : (
        <Environment preset={preset} background={false} ground={false} />
      )}
    </CanvasErrorBoundary>
  );
}

function LoadingFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        borderRadius: "0.75rem",
        zIndex: 10,
      }}
      aria-label="Loading 3D pump model"
    >
      <div
        style={{
          width: "2.5rem",
          height: "2.5rem",
          border: "3px solid #e2e8f0",
          borderTopColor: "#f5a623",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function ErrorFallback({ fallbackImage, onRetry }: { fallbackImage: string; onRetry: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        borderRadius: "0.75rem",
        padding: "1rem",
        zIndex: 10,
      }}
      aria-label="3D model unavailable, showing static image"
    >
      <img
        src={fallbackImage}
        alt="Pumpsquare industrial pump"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
      <button
        type="button"
        onClick={onRetry}
        className="absolute bottom-4 right-4 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
      >
        Retry 3D view
      </button>
    </div>
  );
}

function CanvasContent({
  shadows,
  shadowMapSize,
  environmentPreset,
  active,
  modelLoaded,
  paused,
  prefersReducedMotion,
  userInteractingRef,
  controlsRef,
  autoRotateSpeed,
  pumpModelProps,
  onModelLoad,
  onControlsStart,
  onControlsEnd,
  onContextLost,
}: {
  shadows: boolean;
  shadowMapSize: number;
  environmentPreset: EnvironmentPreset;
  active: boolean;
  modelLoaded: boolean;
  paused: boolean;
  prefersReducedMotion: boolean;
  userInteractingRef: React.MutableRefObject<boolean>;
  controlsRef: React.RefObject<OrbitControlsType | null>;
  autoRotateSpeed: number;
  pumpModelProps: Omit<PumpModelProps, "onLoad" | "onError">;
  onModelLoad: () => void;
  onControlsStart: () => void;
  onControlsEnd: () => void;
  onContextLost: () => void;
}) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost);
  }, [gl, onContextLost]);

  // OrbitControls sets touch-action:none on the canvas; a touch-action that forbids
  // panning also stops wheel scrolling in Chrome. Vertical gestures stay with the
  // page and horizontal ones rotate the model.
  useEffect(() => {
    const canvas = gl.domElement;
    const previous = canvas.style.touchAction;
    canvas.style.touchAction = "pan-y";
    return () => {
      canvas.style.touchAction = previous;
    };
  }, [gl]);

  return (
    <>
      <RenderStateController active={active} />
      <color attach="background" args={["#fafafa"]} />
      {environmentPreset && <ViewerEnvironment preset={environmentPreset} />}
      <ambientLight intensity={0.6} color="#ffffff" />
      {shadows && (
        <>
          <directionalLight
            position={[3, 4, 3]}
            intensity={2.8}
            castShadow
            shadow-mapSize-width={shadowMapSize}
            shadow-mapSize-height={shadowMapSize}
            shadow-camera-near={0.5}
            shadow-camera-far={12}
            shadow-camera-left={-3.5}
            shadow-camera-right={3.5}
            shadow-camera-top={3.5}
            shadow-camera-bottom={-3.5}
            shadow-bias={-0.0001}
            shadow-normalBias={0.02}
          />
        </>
      )}
      <directionalLight position={[-2, 3, -2.5]} intensity={1.5} color="#e8f0f8" />
      <directionalLight position={[0, -1.5, 0]} intensity={0.5} color="#ffffff" />
      <hemisphereLight groundColor="#e8eef5" color="#ffffff" intensity={0.5} />

      {modelLoaded && (
        <>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            // Wheel zoom calls preventDefault() and traps page scroll over the canvas.
            enableZoom={false}
            minZoom={0.3}
            maxZoom={5}
            enableDamping={true}
            dampingFactor={0.08}
            rotateSpeed={0.8}
            autoRotate={false}
            minAzimuthAngle={-Infinity}
            maxAzimuthAngle={Infinity}
            minPolarAngle={0.01}
            maxPolarAngle={Math.PI - 0.01}
            onStart={onControlsStart}
            onEnd={onControlsEnd}
          />
          <AutoRotateController
            enabled={modelLoaded && !prefersReducedMotion && !paused}
            rotationSpeed={autoRotateSpeed}
            userInteractingRef={userInteractingRef}
          />
        </>
      )}
      <PumpModel {...pumpModelProps} onLoad={onModelLoad} />
    </>
  );
}

export function OptimizedCanvas({
  showLabels = true,
  autoRotateSpeed = 1.2,
  fallbackImage,
  labelTop,
  labelBottom,
  environmentPreset = "studio",
  shadows = true,
  shadowMapSize = 2048,
  className = "",
  style,
  ...pumpModelProps
}: OptimizedCanvasProps) {
  const { isClient, tier, dpr, prefersReducedMotion, webglSupported } = useDeviceCapability();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<Error | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [settling, setSettling] = useState(false);
  const releaseTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const userInteractingRef = useRef(false);
  const { isMounted, isInViewport, isTabVisible } = useVisibilityGate(containerRef, {
    rootMargin: RENDER_MARGIN,
    mountMargin: MOUNT_MARGIN,
  });

  // Off-screen or hidden tabs render no frames at all; interaction pauses rotation only.
  const isActive = isInViewport && isTabVisible;

  // After a drag ends, keep damping alive briefly before auto-rotation resumes.
  const handleControlsStart = () => {
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = null;
    userInteractingRef.current = true;
    setSettling(true);
  };

  const handleControlsEnd = () => {
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      releaseTimerRef.current = null;
      userInteractingRef.current = false;
      setSettling(false);
    }, USER_INTERACTION_RESUME_MS);
  };

  const handleContextLost = useCallback(() => setContextLost(true), []);

  useEffect(() => {
    return () => {
      if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    };
  }, []);

  const recreateViewer = () => {
    setContextLost(false);
    setModelError(null);
    setModelLoaded(false);
    // Unmounting R3F releases the lost context; remounting builds a fresh one.
    setCanvasKey((value) => value + 1);
  };

  if (!isClient) {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden flex items-center justify-center ${className}`}
        style={style}
        aria-label="Loading 3D pump viewer"
      >
        <div className="w-10 h-10 border-3 border-line border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!webglSupported) {
    return (
      <div
        ref={containerRef}
        className={`relative aspect-[4/3] rounded-xl border border-line bg-white shadow-xl shadow-primary/10 overflow-hidden ${className}`}
        style={{ ...style, maxWidth: "100%" }}
        aria-label="3D pump model (WebGL not supported, showing static image)"
      >
        <img
          src={fallbackImage}
          alt="Pumpsquare industrial pump"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: "2rem",
          }}
        />
      </div>
    );
  }

  const mobileShadows = tier === "mobile" ? false : shadows;
  const mobileShadowMapSize = getShadowMapSize(tier, shadowMapSize);
  const mobileDpr = dpr;

  const cameraPosition = [
    pumpModelProps.defaultCameraPosition.x,
    pumpModelProps.defaultCameraPosition.y,
    pumpModelProps.defaultCameraPosition.z,
  ] as [number, number, number];

  return (
    <div
      ref={containerRef}
      className={`relative isolate aspect-[4/3] ${shadows ? "rounded-xl border border-line bg-white shadow-xl shadow-primary/10" : "overflow-hidden"} ${className}`}
      style={{ ...style, maxWidth: "100%" }}
    >
      {!modelError && (contextLost || !modelLoaded) && <LoadingFallback />}
      {modelError && <ErrorFallback fallbackImage={fallbackImage} onRetry={recreateViewer} />}
      {contextLost && !modelError && (
        <button
          type="button"
          onClick={recreateViewer}
          className="absolute bottom-4 right-4 z-30 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
        >
          Restore 3D view
        </button>
      )}
      {isMounted && !modelError && (
        <Canvas
          key={canvasKey}
          camera={{ position: cameraPosition, fov: 35 }}
          gl={{
            antialias: false,
            alpha: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance",
          }}
          shadows={mobileShadows}
          dpr={mobileDpr}
          performance={{ min: 0.5 }}
        >
          <CanvasContent
            shadows={mobileShadows}
            shadowMapSize={mobileShadowMapSize}
            environmentPreset={environmentPreset}
            active={isActive}
            modelLoaded={modelLoaded}
            paused={settling}
            prefersReducedMotion={prefersReducedMotion}
            userInteractingRef={userInteractingRef}
            controlsRef={controlsRef}
            autoRotateSpeed={autoRotateSpeed}
            pumpModelProps={{ ...pumpModelProps, tier } as Omit<PumpModelProps, "onLoad" | "onError">}
            onModelLoad={() => setModelLoaded(true)}
            onControlsStart={handleControlsStart}
            onControlsEnd={handleControlsEnd}
            onContextLost={handleContextLost}
          />
        </Canvas>
      )}
      {showLabels && (
        <>
          {labelTop && (
            <div
              className="absolute top-6 left-7 z-20 whitespace-nowrap pointer-events-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {labelTop}
            </div>
          )}
          {labelBottom && (
            <div
              className="absolute bottom-6 left-7 z-20 whitespace-nowrap pointer-events-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {labelBottom}
            </div>
          )}
        </>
      )}
    </div>
  );
}