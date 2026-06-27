/**
 * PuzzleObject
 *
 * An interactable 3D object in the world that triggers a puzzle modal.
 * Click (or walk near) to open the puzzle overlay in the DOM layer.
 *
 * TODO:
 *   - Swap placeholder with .glb prop (altar, rune stone, chest, etc.)
 *   - Add proximity detection via player distance check in useFrame
 *   - Animate (pulsing glow) to hint interactability
 */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export interface PuzzleObjectProps {
  id: string;
  position: [number, number, number];
  onActivate: (id: string) => void;
  solved?: boolean;
}

export default function PuzzleObject({
  id,
  position,
  onActivate,
  solved = false,
}: PuzzleObjectProps) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={() => !solved && onActivate(id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
      >
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={solved ? "#22c55e" : hovered ? "#f59e0b" : "#7c3aed"}
          emissive={solved ? "#052e16" : "#2e1065"}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
      {/* Floating label */}
      {hovered && !solved && (
        <Html center distanceFactor={6} position={[0, 1.2, 0]}>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
            Press E to interact
          </div>
        </Html>
      )}
      <pointLight
        position={[0, 0, 0]}
        intensity={solved ? 0.3 : 0.8}
        color={solved ? "#22c55e" : "#7c3aed"}
        distance={3}
      />
    </group>
  );
}
