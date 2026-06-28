import { Suspense, useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const PLAYER_WORLD_POS = new THREE.Vector3(0, 0, 0);
export const PLAYER_WORLD_ROT = { y: 0 };

useGLTF.preload("/anime_girl.glb");

const MOVE_SPEED = 4;
const TURN_SPEED = 2.8;

const pressedKeys = new Set<string>();

function PlayerModel() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/anime_girl.glb");
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    console.log(actions);
  }, [actions]);

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      pressedKeys.add(e.code);
    };
    const onUp = (e: KeyboardEvent) => pressedKeys.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame((_state, delta) => {
    const g = group.current;
    if (!g) return;

    const forward  = pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp");
    const backward = pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown");
    const left     = pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft");
    const right    = pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight");

    if (left)  g.rotation.y += TURN_SPEED * delta;
    if (right) g.rotation.y -= TURN_SPEED * delta;

    const ry = g.rotation.y;
    if (forward) {
      g.position.x -= Math.sin(ry) * MOVE_SPEED * delta;
      g.position.z -= Math.cos(ry) * MOVE_SPEED * delta;
    }
    if (backward) {
      g.position.x += Math.sin(ry) * MOVE_SPEED * delta;
      g.position.z += Math.cos(ry) * MOVE_SPEED * delta;
    }

    PLAYER_WORLD_POS.copy(g.position);
    PLAYER_WORLD_ROT.y = g.rotation.y;
  });

  return (
    <group ref={group} position={[0, 0, 0]} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

function PlayerFallback() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 1.1, 8, 16]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

export default function Player() {
  return (
    <Suspense fallback={<PlayerFallback />}>
      <PlayerModel />
    </Suspense>
  );
}
