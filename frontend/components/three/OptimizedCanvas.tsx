import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { PumpModel, PumpModelProps } from "./PumpModel";
import { useDeviceCapability } from "./useDeviceCapability";

type EnvironmentPreset = "studio" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "sunset" | "warehouse";

interface OptimizedCanvasProps extends Omit<PumpModelProps, "onLoad" | "onError"> {
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
    if (!enabled || userInteractingRef.current) return;

    const target = new THREE.Vector3();
    camera.getWorldDirection(target);
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed * delta);
    camera.lookAt(target);
  });

  return null;
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

function ErrorFallback({ fallbackImage }: { fallbackImage: string }) {
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
    </div>
  );
}

function CanvasContent({
  dpr,
  shadows,
  shadowMapSize,
  cameraPosition,
  fov,
  environmentPreset,
  modelLoaded,
  modelError,
  prefersReducedMotion,
  userInteractingRef,
  controlsRef,
  autoRotateSpeed,
  pumpModelProps,
  onModelLoad,
  onModelError,
  fallbackImage,
}: {
  dpr: number;
  shadows: boolean;
  shadowMapSize: number;
  cameraPosition: [number, number, number];
  fov: number;
  environmentPreset: EnvironmentPreset;
  modelLoaded: boolean;
  modelError: Error | null;
  prefersReducedMotion: boolean;
  userInteractingRef: React.MutableRefObject<boolean>;
  controlsRef: React.RefObject<OrbitControlsType | null>;
  autoRotateSpeed: number;
  pumpModelProps: Omit<PumpModelProps, "onLoad" | "onError">;
  onModelLoad: () => void;
  onModelError: (error: Error) => void;
  fallbackImage: string;
}) {
  const [shouldRender, setShouldRender] = useState(true);

  useFrame((_, delta) => {
    if (!shouldRender) return;
  });

  return (
    <>
      <color attach="background" args={["#fafafa"]} />
      {environmentPreset && (
        <Environment preset={environmentPreset} background={false} ground={false} />
      )}
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

      {modelLoaded && !modelError && (
        <>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
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
            onStart={() => {
              userInteractingRef.current = true;
            }}
            onEnd={() => {
              userInteractingRef.current = false;
            }}
          />
          <AutoRotateController
            enabled={modelLoaded && !prefersReducedMotion}
            rotationSpeed={autoRotateSpeed}
            userInteractingRef={userInteractingRef}
          />
        </>
      )}
      <PumpModel {...pumpModelProps} onLoad={onModelLoad} onError={onModelError} />
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
  const [isInViewport, setIsInViewport] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const userInteractingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isClient || typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInViewport(entry.isIntersecting);
        });
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isClient]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setModelError(new Error("WebGL context lost"));
    };

    const handleContextRestored = () => {
      setModelError(null);
      setModelLoaded(false);
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, []);

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
  const mobileShadowMapSize = tier === "mobile" ? 1024 : tier === "tablet" ? 1536 : shadowMapSize;
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
      {!modelLoaded && !modelError && <LoadingFallback />}
      {modelError && <ErrorFallback fallbackImage={fallbackImage} />}
      <Canvas
        ref={canvasRef}
        camera={{ position: cameraPosition, fov: 35 }}
        gl={{
          antialias: tier !== "mobile",
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        shadows={mobileShadows}
        dpr={mobileDpr}
        performance={{ min: 0.5 }}
      >
        <CanvasContent
          dpr={mobileDpr}
          shadows={mobileShadows}
          shadowMapSize={mobileShadowMapSize}
          cameraPosition={cameraPosition}
          fov={35}
          environmentPreset={environmentPreset}
          modelLoaded={modelLoaded && isInViewport}
          modelError={modelError}
          prefersReducedMotion={prefersReducedMotion}
          userInteractingRef={userInteractingRef}
          controlsRef={controlsRef}
          autoRotateSpeed={autoRotateSpeed}
          pumpModelProps={pumpModelProps as Omit<PumpModelProps, "onLoad" | "onError">}
          onModelLoad={() => setModelLoaded(true)}
          onModelError={setModelError}
          fallbackImage={fallbackImage}
        />
      </Canvas>
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