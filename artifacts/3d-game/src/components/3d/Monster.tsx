/**
 * Monster
 *
 * A single enemy entity rendered in the 3D world.
 *
 * TODO:
 *   - Load monster .glb (useGLTF) and swap placeholder geometry
 *   - Implement simple FSM: Idle → Chase → Attack → Dead
 *   - On death, call onKill() → triggers NFT mint flow via Openfort
 *   - AABB hit detection vs. player attack radius
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface MonsterProps {
  id: string;
  position: [number, number, number];
  hp?: number;
  onKill?: (id: string) => void;
}

export default function Monster({
  position,
  hp = 100,
}: MonsterProps) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  const alive = hp > 0;

  return alive ? (
    <group ref={ref} position={position}>
      {/* Body */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <boxGeometry args={[0.9, 1.5, 0.9]} />
        <meshStandardMaterial color="#8b0000" roughness={0.5} emissive="#3d0000" />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.45, 12, 12]} />
        <meshStandardMaterial color="#6b0000" roughness={0.5} />
      </mesh>
      {/* Glowing eyes */}
      <pointLight position={[0, 1.8, 0.4]} intensity={0.6} color="#ff2020" distance={2} />
    </group>
  ) : null;
}
