/**
 * TreasureChest
 *
 * Finale reward object (Task 3b/3c): appears in front of the temple once
 * all 4 essences are collected. Stylized procedural geometry (dark wood
 * box + gold trim + glowing seam, no GLB), ringed by a sparkle fountain.
 * Reuses the same proximity + "press E" pattern GlowingPuzzle.tsx already
 * established (tracked locally here, not shared, so this file never has
 * to import/modify GlowingPuzzle's puzzle-mini-game logic) to show a
 * "Press E to claim" prompt and fire `onClaim` once.
 */
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";
import SparkleFountain from "../effects/SparkleFountain";

export interface TreasureChestProps {
  position: [number, number, number];
  claimed: boolean;
  onClaim: () => void;
}

const CLAIM_RANGE = 3.2;

export default function TreasureChest({ position, claimed, onClaim }: TreasureChestProps) {
  const [inRange, setInRange] = useState(false);
  const lidRef = useRef<THREE.Group>(null);
  const chestPos = useRef(new THREE.Vector3(...position));
  const inRangeRef = useRef(false);

  useEffect(() => {
    inRangeRef.current = inRange;
  }, [inRange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "e") return;
      if (inRangeRef.current && !claimed) onClaim();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [claimed, onClaim]);

  useFrame((state) => {
    const distance = PLAYER_WORLD_POS.distanceTo(chestPos.current);
    const nowInRange = distance <= CLAIM_RANGE;
    if (nowInRange !== inRange) setInRange(nowInRange);

    const lid = lidRef.current;
    if (lid) {
      const targetAngle = claimed ? -Math.PI / 2.6 : 0;
      lid.rotation.x = THREE.MathUtils.lerp(lid.rotation.x, targetAngle, 0.05);
    }
  });

  return (
    <group position={position}>
      {/* Base box — dark wood */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.7, 0.9]} />
        <meshStandardMaterial color="#4a3324" roughness={0.8} />
      </mesh>

      {/* Gold trim bands */}
      {[-0.55, 0, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <boxGeometry args={[0.08, 0.72, 0.94]} />
          <meshStandardMaterial color="#e8b84b" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* Hinged lid group */}
      <group ref={lidRef} position={[0, 0.7, -0.45]}>
        <mesh position={[0, 0.2, 0.45]} castShadow>
          <boxGeometry args={[1.42, 0.4, 0.92]} />
          <meshStandardMaterial color="#5a3d29" roughness={0.75} />
        </mesh>
        {/* Glowing seam under the lid edge */}
        <mesh position={[0, 0.02, 0.9]}>
          <boxGeometry args={[1.3, 0.04, 0.05]} />
          <meshStandardMaterial
            color="#ffe08a"
            emissive="#ffcf5c"
            emissiveIntensity={claimed ? 2.5 : 1.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      <pointLight position={[0, 0.9, 0]} color="#ffcf5c" intensity={1.4} distance={5} />

      <SparkleFountain count={90} radius={0.9} height={2.2} />

      {inRange && !claimed && (
        <Html center distanceFactor={6} position={[0, 1.5, 0]}>
          <div className="bg-black/70 text-amber-200 text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap font-semibold">
            Press E to claim
          </div>
        </Html>
      )}
    </group>
  );
}
