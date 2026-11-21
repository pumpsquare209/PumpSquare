"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, Suspense, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { cn } from "@/lib/utils";

interface Product3DModelViewerProps {
  modelUrl: string;
  modelName: string;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CAMERA_POSITION = [0, 0.1, 3.5] as [number, number, number];
const DEFAULT_MODEL_SCALE = 2.2;

class ModelErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function LoadingFallback() {
  return (
    <div
      className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-[#fafafa]"
      aria-label="Loading 3D model"
    >
      <div className="size-10 animate-spin rounded-full border-3 border-line border-t-accent" />
    </div>
  );
}

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-[#fafafa] p-4"
      aria-label="3D model unavailable"
    >
      <svg className="mb-3 size-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="mb-2 text-center text-sm font-medium text-muted">Unable to load 3D model</p>
      <p className="mb-4 max-w-xs text-center text-xs text-muted">{error.message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        Retry
      </button>
    </div>
  );
}

function ModelInner({ modelUrl, onLoad }: { modelUrl: string; onLoad: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const currentGroup = groupRef.current;
    if (!currentGroup) return;

    model.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.metalness = Math.min(material.metalness ?? 0.5, 0.8);
            material.roughness = Math.max(material.roughness ?? 0.5, 0.3);
          }
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    model.position.sub(center);
    if (maxDim > 0 && Number.isFinite(maxDim)) model.scale.setScalar(DEFAULT_MODEL_SCALE / maxDim);
    currentGroup.add(model);
    onLoad();

    return () => {
      currentGroup.remove(model);
    };
  }, [model, onLoad]);

  return <group ref={groupRef} />;
}

function ViewerCanvas({
  modelUrl,
  modelName,
  onLoad,
  onError,
  className,
  style,
}: {
  modelUrl: string;
  modelName: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<Error | null>(null);
  const [isInViewport, setIsInViewport] = useState(() => typeof IntersectionObserver === "undefined");
  const [retryKey, setRetryKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const userInteractingRef = useRef(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setIsInViewport(entry.isIntersecting);
      },
      { rootMargin: "200px", threshold: 0 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setModelLoaded(true);
    setModelError(null);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(
    (error: Error) => {
      setModelError(error);
      setModelLoaded(false);
      onError?.(error);
    },
    [onError],
  );

  const handleRetry = () => {
    useGLTF.clear(modelUrl);
    setRetryKey((value) => value + 1);
    setModelError(null);
    setModelLoaded(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-white shadow-xl shadow-primary/10",
        className,
      )}
      style={style}
    >
      <span className="sr-only">3D model: {modelName}</span>
      <Canvas
        camera={{ position: DEFAULT_CAMERA_POSITION, fov: 35 }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
        }}
        shadows
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={["#fafafa"]} />
        <ambientLight intensity={0.9} color="#ffffff" />
        <directionalLight
          position={[3, 4, 3]}
          intensity={2.6}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={12}
          shadow-camera-left={-3.5}
          shadow-camera-right={3.5}
          shadow-camera-top={3.5}
          shadow-camera-bottom={-3.5}
          shadow-bias={-0.0001}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-2, 3, -2.5]} intensity={1.4} color="#e8f0f8" />
        <directionalLight position={[0, -1.5, 0]} intensity={0.5} color="#ffffff" />
        <hemisphereLight groundColor="#e8eef5" color="#ffffff" intensity={0.6} />
        {isInViewport ? (
          <ModelErrorBoundary key={`${modelUrl}-${retryKey}`} onError={handleError}>
            <Suspense fallback={null}>
              <ModelInner modelUrl={modelUrl} onLoad={handleLoad} />
            </Suspense>
          </ModelErrorBoundary>
        ) : null}
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableZoom
          minZoom={0.3}
          maxZoom={5}
          enableDamping
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
        <AutoRotateController enabled={modelLoaded} rotationSpeed={0.3} userInteractingRef={userInteractingRef} />
      </Canvas>
      {!modelLoaded && !modelError ? <LoadingFallback /> : null}
      {modelError ? <ErrorFallback error={modelError} onRetry={handleRetry} /> : null}
    </div>
  );
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

export default function Product3DModelViewer({ modelUrl, modelName, className, style }: Product3DModelViewerProps) {
  return (
    <ViewerCanvas
      modelUrl={modelUrl}
      modelName={modelName}
      className={className}
      style={style}
    />
  );
}
