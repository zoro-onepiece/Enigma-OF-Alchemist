import { Suspense } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface ModelLoaderProps {
  url?: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
}

function GLBModel({ url, position = [0, 0, 0], scale = 1 }: Required<ModelLoaderProps>) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} position={position} scale={scale} />;
}

function PlaceholderMesh() {
  return (
    <group position={[0, 0.75, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color="#7c3aed"
          roughness={0.3}
          metalness={0.6}
          wireframe={false}
        />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

export default function ModelLoader({
  url,
  position = [0, 0, 0],
  scale = 1,
}: ModelLoaderProps) {
  if (!url) {
    return <PlaceholderMesh />;
  }

  return (
    <Suspense fallback={<PlaceholderMesh />}>
      <GLBModel url={url} position={position} scale={scale} />
    </Suspense>
  );
}
