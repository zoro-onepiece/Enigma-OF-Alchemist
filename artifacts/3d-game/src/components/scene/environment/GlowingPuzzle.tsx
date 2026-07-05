import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";

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
 *
 * Proximity + "Press E": each instance tracks its own distance to
 * PLAYER_WORLD_POS every frame and registers itself in a small
 * module-scoped registry (not React/Zustand state — this is purely a
 * same-file coordination mechanism, so it doesn't violate the "extend
 * gameStore.ts only" constraint). A single shared `keydown` listener reads
 * that registry to find the *nearest* unsolved puzzle currently in range
 * and activates only that one, so standing between two puzzles doesn't
 * double-trigger them.
 */
export interface GlowingPuzzleProps {
  id: string;
  position: [number, number, number];
  color?: string;
  isSolved?: boolean;
  onActivate?: (id: string) => void;
}

const SOLVED_COLOR = "#facc15";
const PROXIMITY_RANGE = 3.5;

interface ProximityEntry {
  distance: number;
  solved: boolean;
  activate: () => void;
}

const proximityRegistry = new Map<string, ProximityEntry>();
let globalKeyListenerAttached = false;

function ensureGlobalKeyListener() {
  if (globalKeyListenerAttached) return;
  globalKeyListenerAttached = true;
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "e") return;
    let nearest: ProximityEntry | null = null;
    for (const entry of proximityRegistry.values()) {
      if (entry.solved) continue;
      if (entry.distance > PROXIMITY_RANGE) continue;
      if (!nearest || entry.distance < nearest.distance) nearest = entry;
    }
    nearest?.activate();
  });
}

export default function GlowingPuzzle({
  id,
  position,
  color = "#a78bfa",
  isSolved = false,
  onActivate,
}: GlowingPuzzleProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [inRange, setInRange] = useState(false);
  const activeColor = isSolved ? SOLVED_COLOR : color;
  const puzzlePos = useRef(new THREE.Vector3(...position));

  const activate = () => !isSolved && onActivate?.(id);

  // Keep the shared proximity registry in sync with this instance's latest
  // solved flag / activate handler even when they change between renders.
  useEffect(() => {
    ensureGlobalKeyListener();
    return () => {
      proximityRegistry.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFrame((state) => {
    const ring = ringRef.current;
    if (ring) {
      ring.rotation.z += 0.006;
      ring.position.y = isSolved
        ? 0.9
        : 0.9 + Math.sin(state.clock.elapsedTime * 1.8) * 0.12;
    }

    const distance = PLAYER_WORLD_POS.distanceTo(puzzlePos.current);
    proximityRegistry.set(id, { distance, solved: isSolved, activate });

    const nowInRange = !isSolved && distance <= PROXIMITY_RANGE;
    if (nowInRange !== inRange) setInRange(nowInRange);
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
        onClick={() => activate()}
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

      {(hovered || inRange) && !isSolved && (
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
