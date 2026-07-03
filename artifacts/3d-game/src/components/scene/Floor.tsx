import { useRef } from "react";
import * as THREE from "three";

export default function Floor() {
  const ref = useRef<THREE.Mesh>(null);

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      // Placeholder plane is superseded by the forest's own ground mesh
      // (WorldModel in Scene.tsx). Kept mounted (not deleted) in case
      // anything ever raycasts against it for ground detection.
      visible={false}
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.1} />
    </mesh>
  );
}
