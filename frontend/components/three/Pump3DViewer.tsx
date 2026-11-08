"use client";

import { useRef, useState, useEffect, useCallback, Component, ReactNode, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { RotateCcw } from "lucide-react";

const MODEL_PATH = "/models/homelastsection.glb";
const FALLBACK_IMAGE = "/images/Industrial_Blue_Pump_Assembly-removebg-preview.png";

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

type PumpModelProps = {
  onLoad?: () => void;
  onError?: (error: Error) => void;
};

const INDUSTRIAL_BLUE = 0x0876d1;
const DARK_BLUE = 0x07549a;
const METALLIC_SILVER = 0xbfc9d4;
const LIGHT_BLUE_HIGHLIGHT = 0x4da8da;

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 0.1, 3.5);
const DEFAULT_MODEL_SCALE = 2.2;

function createPumpMaterials() {
  const mainBodyMaterial = new THREE.MeshStandardMaterial({
    color: INDUSTRIAL_BLUE,
    metalness: 0.75,
    roughness: 0.3,
  });

  const darkBlueMaterial = new THREE.MeshStandardMaterial({
    color: DARK_BLUE,
    metalness: 0.7,
    roughness: 0.35,
  });

  const metallicMaterial = new THREE.MeshStandardMaterial({
    color: METALLIC_SILVER,
    metalness: 0.95,
    roughness: 0.15,
  });

  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d0d8,
    metalness: 0.9,
    roughness: 0.2,
  });

  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: LIGHT_BLUE_HIGHLIGHT,
    metalness: 0.5,
    roughness: 0.3,
  });

  return {
    mainBody: mainBodyMaterial,
    darkBlue: darkBlueMaterial,
    metallic: metallicMaterial,
    shaft: shaftMaterial,
    highlight: highlightMaterial,
  };
}

function PumpModelInner({ onLoad, onError }: PumpModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_PATH);
  const materialsRef = useRef<ReturnType<typeof createPumpMaterials> | null>(null);

  useEffect(() => {
    if (!groupRef.current || !scene) {
      console.log("PumpModel: missing groupRef or scene", { groupRef: !!groupRef.current, scene: !!scene });
      return;
    }

    console.log("PumpModel: scene loaded", { children: scene.children.length });

    const currentGroup = groupRef.current;

    scene.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log("PumpModel: bounding box", JSON.stringify({
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z },
      size: { x: size.x, y: size.y, z: size.z },
      center: { x: center.x, y: center.y, z: center.z }
    }));

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        console.log(`Mesh: ${child.name || 'unnamed'}`, JSON.stringify({
          geometry: child.geometry.type,
          vertices: child.geometry.attributes.position?.count,
          material: child.material.type,
          color: mat.color ? '#' + mat.color.getHexString() : 'none',
          metalness: mat.metalness,
          roughness: mat.roughness,
        }));
      }
    });

    if (!materialsRef.current) {
      materialsRef.current = createPumpMaterials();
    }

    const mats = materialsRef.current;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = (child.name || '').toLowerCase();

        if (
          name.includes('bolt') ||
          name.includes('screw') ||
          name.includes('nut') ||
          name.includes('fastener') ||
          name.includes('washer') ||
          name.includes('rivet')
        ) {
          child.material = mats.metallic;
        } else if (
          name.includes('shaft') ||
          name.includes('flange') ||
          name.includes('coupling') ||
          name.includes('bearing') ||
          name.includes('seal')
        ) {
          child.material = mats.shaft;
        } else if (
          name.includes('base') ||
          name.includes('foot') ||
          name.includes('mount') ||
          name.includes('frame') ||
          name.includes('bracket') ||
          name.includes('support')
        ) {
          child.material = mats.darkBlue;
        } else if (
          name.includes('highlight') ||
          name.includes('trim') ||
          name.includes('accent') ||
          name.includes('detail') ||
          name.includes('ring') ||
          name.includes('groove')
        ) {
          child.material = mats.highlight;
        } else {
          child.material = mats.mainBody;
        }

        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    scene.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = DEFAULT_MODEL_SCALE / maxDim;
    scene.scale.setScalar(scale);

    console.log(`PumpModel: Applied scale ${scale.toFixed(3)} (maxDim: ${maxDim.toFixed(3)}, target: ${DEFAULT_MODEL_SCALE})`);

    currentGroup.add(scene);
    onLoad?.();

    return () => {
      currentGroup.remove(scene);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      if (materialsRef.current) {
        Object.values(materialsRef.current).forEach(m => m.dispose());
        materialsRef.current = null;
      }
    };
  }, [scene, onLoad]);

  return <group ref={groupRef} />;
}

function PumpModel({ onLoad, onError }: PumpModelProps) {
  return (
    <Suspense fallback={null}>
      <PumpModelInner onLoad={onLoad} onError={onError} />
    </Suspense>
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
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotationSpeed * delta);
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
        background: "transparent",
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

function ErrorFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        padding: "1rem",
        zIndex: 10,
      }}
      aria-label="3D model unavailable, showing static image"
    >
      <img
        src={FALLBACK_IMAGE}
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

class ModelErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode; onError?: (error: Error) => void }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ModelErrorBoundary caught error:", error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface Pump3DViewerProps {
  showLabels?: boolean;
  autoRotateSpeed?: number;
}

export default function Pump3DViewer({ showLabels = true, autoRotateSpeed = 1.2 }: Pump3DViewerProps) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<Error | null>(null);
  const [webglSupported, setWebglSupported] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const userInteractingRef = useRef(false);

  const handleInteractionStart = useCallback(() => {
    userInteractingRef.current = true;
  }, []);

  const handleInteractionEnd = useCallback(() => {
    userInteractingRef.current = false;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for SSR hydration check
    setIsClient(true);
    setWebglSupported(checkWebGLSupport());
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
      mediaQuery.addEventListener?.("change", handler);
      return () => mediaQuery.removeEventListener?.("change", handler);
    }
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

  if (!webglSupported) {
    return (
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{ maxWidth: "100%" }}
        aria-label="3D pump model (WebGL not supported, showing static image)"
      >
        <img
          src={FALLBACK_IMAGE}
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

  return (
    <div
      className="relative isolate aspect-[4/3] overflow-hidden"
      style={{ maxWidth: "100%" }}
    >
      {!modelLoaded && !modelError && <LoadingFallback />}
      {modelError && <ErrorFallback />}
      <Canvas
        camera={{ position: [DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z], fov: 35 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
        shadows={true}
      >
        <color attach="background" args={["transparent"]} />
        
        <Environment
          preset="studio"
          background={false}
          ground={false}
        />
        
        <ambientLight intensity={0.6} color="#ffffff" />
        
        <directionalLight
          position={[3, 4, 3]}
          intensity={2.8}
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
        
        <directionalLight
          position={[-2, 3, -2.5]}
          intensity={1.5}
          color="#e8f0f8"
        />
        
        <directionalLight
          position={[0, -1.5, 0]}
          intensity={0.5}
          color="#ffffff"
        />
        
        <hemisphereLight groundColor="#e8eef5" color="#ffffff" intensity={0.5} />

        {modelLoaded && !modelError && (
          <>
            <OrbitControls
              ref={controlsRef}
              enablePan={false}
              enableZoom={true}
              minZoom={0.5}
              maxZoom={8}
              enableDamping={true}
              dampingFactor={0.08}
              rotateSpeed={0.8}
              autoRotate={false}
              minAzimuthAngle={-Infinity}
              maxAzimuthAngle={Infinity}
              minPolarAngle={0.01}
              maxPolarAngle={Math.PI - 0.01}
              onStart={handleInteractionStart}
              onEnd={handleInteractionEnd}
            />
            <AutoRotateController
              enabled={modelLoaded && !prefersReducedMotion}
              rotationSpeed={autoRotateSpeed}
              userInteractingRef={userInteractingRef}
            />
          </>
        )}
        <ModelErrorBoundary fallback={<ErrorFallback />} onError={setModelError}>
          <PumpModel
            onLoad={() => setModelLoaded(true)}
            onError={setModelError}
          />
        </ModelErrorBoundary>
      </Canvas>
      {showLabels && (
        <>
          {/* Top-left label: INTERACTIVE 3D SHOWCASE */}
          <div
            className="absolute top-6 left-7 z-20 whitespace-nowrap pointer-events-none"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 rounded bg-accent" />
              <span className="text-xs font-bold tracking-wider uppercase text-primary">
                INTERACTIVE 3D SHOWCASE
              </span>
            </div>
          </div>
          {/* Bottom-left label: 360° View */}
          <div
            className="absolute bottom-6 left-7 z-20 whitespace-nowrap pointer-events-none"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4 text-ink/70" aria-hidden="true" />
              <span className="text-sm font-medium text-ink">
                360° View
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

useGLTF.preload(MODEL_PATH);