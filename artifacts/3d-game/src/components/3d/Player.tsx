/**
 * Player
 *
 * The player character controller.
 *
 * TODO:
 *   - Load player .glb model with useGLTF
 *   - Wire WASD / arrow key movement via useKeyboardControls (Drei)
 *   - Add animation mixer (idle / run / attack) via useAnimations
 *   - Attach a third-person follow camera
 *   - Integrate collision detection with the terrain
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface PlayerProps {
  position?: [number, number, number];
  modelUrl?: string;
}

export default function Player({ position = [0, 0.5, 0] }: PlayerProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_state, _delta) => {
    // TODO: read keyboard state and move ref.current.position
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      {/* Placeholder capsule — replace with <primitive object={gltf.scene} /> */}
      <capsuleGeometry args={[0.35, 1, 8, 16]} />
      <meshStandardMaterial color="#7c3aed" roughness={0.4} metalness={0.5} />
    </mesh>
  );
}
