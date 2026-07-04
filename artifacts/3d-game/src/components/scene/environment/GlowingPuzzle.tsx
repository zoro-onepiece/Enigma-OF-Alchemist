import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

/**
 * GlowingPuzzle
 *
 * Visual: a dark stone octagon base with a floating, glowing rune ring
 * hovering above it (bobbing + slow rotation while unsolved). Interaction
 * contract intentionally mirrors PuzzleObject.tsx (id/position/onActivate/
 * solved + hover tooltip) so this reuses the game's existing click/interact
 * pattern instead of inventing a new one — GameEnvironment wires `onActivate`
 * and `isSolved` straight to the gameStore's openPuzzle action / puzzle.solved
 * set, same as PuzzleObject would.
 */
export interface GlowingPuzzleProps {
  id: string;
  position: [number, number, number];
  color?: string;
  isSolved?: boolean;
  onActivate?: (id: string) => void;
}

const SOLVED_COLOR = "#facc15";

export default function GlowingPuzzle({
  id,
  position,
  color = "#a78bfa",
  isSolved = false,
  onActivate,
}: GlowingPuzzleProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const activeColor = isSolved ? SOLVED_COLOR : color;

  useFrame((state) => {
    const ring = ringRef.current;
    if (!ring) return;
    ring.rotation.z += 0.006;
    ring.position.y = isSolved
      ? 0.9
      : 0.9 + Math.sin(state.clock.elapsedTime * 1.8) * 0.12;
  });

  return (
    <group position={position}>
      {/* Base — dark stone octagon */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.65, 0.75, 0.3, 8]} />
        <meshStandardMaterial color="#2b2733" roughness={0.85} />
      </mesh>

      {/* Glowing rune ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.9, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={() => !isSolved && onActivate?.(id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry args={[0.32, 0.5, 6]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={isSolved ? 1.4 : 2}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {hovered && !isSolved && (
        <Html center distanceFactor={6} position={[0, 1.5, 0]}>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
            Press E to interact
          </div>
        </Html>
      )}

      <pointLight position={[0, 0.9, 0]} color={activeColor} intensity={1} distance={4} />
    </group>
  );
}
