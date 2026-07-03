import { Suspense, useRef, useEffect, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame, createPortal } from "@react-three/fiber";
import * as THREE from "three";

export const PLAYER_WORLD_POS = new THREE.Vector3(0, 0, 0);
export const PLAYER_WORLD_ROT = { y: 0 };

useGLTF.preload("/anime_girl.glb");
useGLTF.preload("/animations.glb");

const MOVE_SPEED = 4;
const TURN_SPEED = 2.8;

const pressedKeys = new Set<string>();

function PlayerModel() {
  const group = useRef<THREE.Group>(null);

  // Colored (skinned) model — this is what gets rendered
  const { scene } = useGLTF("/anime_girl.glb");

  // Grey model — only its animation clips are used
  const { animations } = useGLTF("/animations.glb");

  // Retarget: apply animations.glb clips onto anime_girl.glb's skeleton (group ref)
  const { actions } = useAnimations(animations, group);

  const [rightHand, setRightHand] = useState<THREE.Bone | null>(null);

  // Play "Idle" by default once actions are ready
  useEffect(() => {
    const idle = actions["Idle"];
    idle?.reset().fadeIn(0.3).play();
    return () => {
      idle?.fadeOut(0.3);
    };
  }, [actions]);

  // One-time traversal: enable shadows + locate the right-hand bone
  useEffect(() => {
    let hand: THREE.Bone | null = null;
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
      if (
        (child as THREE.Bone).isBone &&
        /(mixamorig)?right\s*hand/i.test(child.name)
      ) {
        hand = child as THREE.Bone;
      }
    });
    setRightHand(hand);
  }, [scene]);

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

      {/* Weapon attachment: portal a mesh directly into the bone's local space
          so it inherits the bone's animated position/rotation every frame. */}
      {rightHand &&
        createPortal(
          <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.35]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
          </mesh>,
          rightHand,
        )}
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
