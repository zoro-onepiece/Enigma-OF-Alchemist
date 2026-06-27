import { Suspense, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/anime_girl.glb");

interface PlayerModelProps {
  position: [number, number, number];
}

function PlayerModel({ position }: PlayerModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/anime_girl.glb");

  // Enable shadows on every mesh in the loaded model
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.envMapIntensity = 0.8;
      }
    }
  });

  useFrame((_state, _delta) => {
    // TODO: read keyboard state and update group.current.position / rotation
    // e.g. group.current.position.x += velocity.x * delta
  });

  return (
    <group ref={group} position={position} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

function PlayerFallback({ position }: PlayerModelProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <capsuleGeometry args={[0.35, 1, 8, 16]} />
      <meshStandardMaterial color="#7c3aed" roughness={0.4} metalness={0.5} />
    </mesh>
  );
}

export interface PlayerProps {
  position?: [number, number, number];
}

export default function Player({ position = [0, 0, 0] }: PlayerProps) {
  return (
    <Suspense fallback={<PlayerFallback position={position} />}>
      <PlayerModel position={position} />
    </Suspense>
  );
}
