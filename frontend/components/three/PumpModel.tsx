"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getModelPath, type DeviceTier } from "./useDeviceCapability";

const INDUSTRIAL_BLUE = 0x0876d1;
const DARK_BLUE = 0x07549a;
const METALLIC_SILVER = 0xbfc9d4;
const LIGHT_BLUE_HIGHLIGHT = 0x4da8da;

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

export interface PumpModelProps {
  desktopModelPath: string;
  mobileModelPath: string;
  tabletModelPath?: string;
  defaultCameraPosition: THREE.Vector3;
  defaultModelScale: number;
  /** Device tier is owned by the parent canvas so the model URL is correct on the first render. */
  tier: DeviceTier;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

function PumpModelInner({ modelPath, defaultModelScale, onLoad }: {
  modelPath: string;
  defaultModelScale: number;
  onLoad?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);
  const materialsRef = useRef<ReturnType<typeof createPumpMaterials> | null>(null);

  useEffect(() => {
    if (!groupRef.current || !scene) {
      return;
    }

    const currentGroup = groupRef.current;

    scene.scale.setScalar(1);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (!materialsRef.current) {
      materialsRef.current = createPumpMaterials();
    }

    const mats = materialsRef.current;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = (child.name || "").toLowerCase();

        if (
          name.includes("bolt") ||
          name.includes("screw") ||
          name.includes("nut") ||
          name.includes("fastener") ||
          name.includes("washer") ||
          name.includes("rivet")
        ) {
          child.material = mats.metallic;
        } else if (
          name.includes("shaft") ||
          name.includes("flange") ||
          name.includes("coupling") ||
          name.includes("bearing") ||
          name.includes("seal")
        ) {
          child.material = mats.shaft;
        } else if (
          name.includes("base") ||
          name.includes("foot") ||
          name.includes("mount") ||
          name.includes("frame") ||
          name.includes("bracket") ||
          name.includes("support")
        ) {
          child.material = mats.darkBlue;
        } else if (
          name.includes("highlight") ||
          name.includes("trim") ||
          name.includes("accent") ||
          name.includes("detail") ||
          name.includes("ring") ||
          name.includes("groove")
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
    const scale = defaultModelScale / maxDim;
    scene.scale.setScalar(scale);

    currentGroup.add(scene);
    onLoad?.();

    const materials = mats;

    return () => {
      currentGroup.remove(scene);
      // The scene object is owned by useGLTF's shared cache and may be remounted in
      // another canvas, so only release GPU-side resources, never the geometry itself.
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
      Object.values(materials).forEach((m) => m.dispose());
      if (materialsRef.current === materials) materialsRef.current = null;
    };
  }, [scene, onLoad, defaultModelScale]);

  return <group ref={groupRef} dispose={null} />;
}

export function PumpModel({
  desktopModelPath,
  mobileModelPath,
  defaultModelScale,
  tier,
  onLoad,
}: PumpModelProps) {
  const [resolvedPath] = useState(() =>
    getModelPath(tier, desktopModelPath, mobileModelPath)
  );

  return (
    <Suspense fallback={null}>
      <PumpModelInner modelPath={resolvedPath} defaultModelScale={defaultModelScale} onLoad={onLoad} />
    </Suspense>
  );
}