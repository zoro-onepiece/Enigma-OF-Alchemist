import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * QuantumTree
 *
 * Stylized sci-fi "tree": a thin dark trunk with radiating thin branches,
 * and a glowing wireframe-over-translucent icosahedron canopy that doubles
 * as a light source (a real THREE.PointLight sits inside it so it actually
 * lights the ground/nearby foliage, not just a fake emissive material).
 */
export interface QuantumTreeProps {
  position?: [number, number, number];
  scale?: number;
  color?: string;
}

const BRANCH_COUNT = 5;

export default function QuantumTree({
  position = [0, 0, 0],
  scale = 1,
  color = "#7c3aed",
}: QuantumTreeProps) {
  const wireframeRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (wireframeRef.current) {
      wireframeRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Trunk — thin, dark, with an emissive edge tint */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 2, 6]} />
        <meshStandardMaterial
          color="#0f0f1a"
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Branches — thin tapered cylinders fanned radially upward */}
      {Array.from({ length: BRANCH_COUNT }).map((_, i) => {
        const angle = (i / BRANCH_COUNT) * Math.PI * 2;
        const tilt = Math.PI / 3.2;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.25, 1.9, Math.sin(angle) * 0.25]}
            rotation={[Math.cos(angle) * tilt, angle, Math.sin(angle) * tilt]}
            castShadow
          >
            <cylinderGeometry args={[0.02, 0.06, 0.9, 5]} />
            <meshStandardMaterial
              color="#0f0f1a"
              emissive={color}
              emissiveIntensity={0.5}
              roughness={0.4}
            />
          </mesh>
        );
      })}

      {/* Glowing canopy — wireframe shell over a translucent glow-core */}
      <group position={[0, 2.6, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={color} transparent opacity={0.25} />
        </mesh>
        <mesh ref={wireframeRef}>
          <icosahedronGeometry args={[0.78, 0]} />
          <meshBasicMaterial color={color} wireframe />
        </mesh>
        <pointLight color={color} intensity={1.5} distance={6} />
      </group>
    </group>
  );
}
