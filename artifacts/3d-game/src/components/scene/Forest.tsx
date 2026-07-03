import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/models/low_poly_forest.glb");
useGLTF.preload("/models/trees_optimized.glb");

function useCloneScene(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
}

function ForestGround() {
  const scene = useCloneScene("/models/low_poly_forest.glb");
  return <primitive object={scene} position={[0, 0, 0]} scale={1} />;
}

// A handful of scattered tree clusters ringing the play area
const TREE_PLACEMENTS: Array<{ pos: [number, number, number]; rot: number; scale: number }> = [
  { pos: [14, 0, 6],   rot: 0.3,  scale: 1.1 },
  { pos: [-16, 0, 10], rot: 1.2,  scale: 0.9 },
  { pos: [18, 0, -12], rot: 2.1,  scale: 1.3 },
  { pos: [-20, 0, -8], rot: 0.7,  scale: 1.0 },
  { pos: [6, 0, -22],  rot: 2.8,  scale: 1.15 },
  { pos: [-8, 0, 20],  rot: 1.6,  scale: 1.05 },
  { pos: [22, 0, 18],  rot: 0.4,  scale: 0.95 },
  { pos: [-22, 0, -20], rot: 2.4, scale: 1.2 },
];

function TreeCluster({ pos, rot, scale }: { pos: [number, number, number]; rot: number; scale: number }) {
  const scene = useCloneScene("/models/trees_optimized.glb");
  return <primitive object={scene} position={pos} rotation={[0, rot, 0]} scale={scale} />;
}

export default function Forest() {
  return (
    <group>
      <ForestGround />
      {TREE_PLACEMENTS.map((t, i) => (
        <TreeCluster key={i} {...t} />
      ))}
    </group>
  );
}
