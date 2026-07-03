import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
import { useFrame, createPortal } from "@react-three/fiber";
import * as THREE from "three";

// Spawn on an open grassy patch of the "grnd" mesh, clear of the water mesh.
// Computed from the forest GLB's own mesh bounds (not eyeballed): at
// targetSize=250 the model's world offset re-centers X/Z to 0, so
// worldX = (localX - modelCenterX) * scale, worldZ = (localZ - modelCenterZ) * scale.
// Picked local (x=0, z=2.5) — inside grnd's footprint (x: -3.1..2.9, z: 0..3.4),
// safely past water's extent (z: -1.0..1.7). scale = 250/6.73 ≈ 37.15.
export const PLAYER_SPAWN: [number, number, number] = [13.56, 0, 48.85];
export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
export const PLAYER_WORLD_ROT = { y: 0 };

// ─── Keyboard control map ──────────────────────────────────────────────────
// Consumed by <KeyboardControls map={playerKeyboardMap}> wrapping the
// <Canvas> in Scene.tsx.
export enum PlayerControl {
  forward = "forward",
  backward = "backward",
  left = "left",
  right = "right",
  sprint = "sprint",
  toggleWeapon = "toggleWeapon",
}

export const playerKeyboardMap = [
  { name: PlayerControl.forward, keys: ["KeyW", "ArrowUp"] },
  { name: PlayerControl.backward, keys: ["KeyS", "ArrowDown"] },
  { name: PlayerControl.left, keys: ["KeyA", "ArrowLeft"] },
  { name: PlayerControl.right, keys: ["KeyD", "ArrowRight"] },
  { name: PlayerControl.sprint, keys: ["ShiftLeft", "ShiftRight"] },
  { name: PlayerControl.toggleWeapon, keys: ["KeyQ"] },
];

useGLTF.preload("/final_player3.glb");
useGLTF.preload("/gun.glb");

const WALK_SPEED = 2.2;
const RUN_SPEED = 4.5;
const TURN_LERP = 10; // higher = snappier facing rotation

function PlayerModel() {
  const group = useRef<THREE.Group>(null);

  // Final animated character: mesh + armature + 6 clips
  // ('idle', 'walk', 'run', 'melee', 'gun', 'gun-fire').
  const { scene, animations } = useGLTF("/final_player3.glb");
  const { actions, mixer } = useAnimations(animations, group);

  // Separate weapon model, portaled into the right-hand bone.
  const { scene: gunSceneSrc } = useGLTF("/gun.glb");
  const gunScene = useMemo(() => gunSceneSrc.clone(), [gunSceneSrc]);

  const [rightHand, setRightHand] = useState<THREE.Bone | null>(null);
  const [isGunEquipped, setIsGunEquipped] = useState(false);

  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const isAttacking = useRef(false);

  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();

  // ── Crossfade helper ───────────────────────────────────────────────────
  const crossFadeTo = (name: string, duration = 0.25, once = false) => {
    const next = actions[name];
    if (!next || next === activeAction.current) return;

    next.reset();
    if (once) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
    }
    next.enabled = true;
    next.play();

    if (activeAction.current) {
      activeAction.current.crossFadeTo(next, duration, true);
    } else {
      next.fadeIn(duration);
    }
    activeAction.current = next;
  };

  // Default idle once actions are ready
  useEffect(() => {
    crossFadeTo("idle", 0.3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  // Q toggles weapon mode — edge-triggered so holding the key doesn't
  // rapid-toggle every frame.
  useEffect(() => {
    return subscribeKeys(
      (state) => state.toggleWeapon,
      (pressed) => {
        if (pressed) setIsGunEquipped((v) => !v);
      },
    );
  }, [subscribeKeys]);

  // Left mouse click → attack (melee or gun-fire depending on isGunEquipped)
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isAttacking.current) return;
      isAttacking.current = true;
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

  // When a one-shot attack clip finishes, drop back to the base animation.
  useEffect(() => {
    if (!mixer) return;
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === actions["melee"] || e.action === actions["gun-fire"]) {
        isAttacking.current = false;
      }
    };
    mixer.addEventListener("finished", onFinished);
    return () => mixer.removeEventListener("finished", onFinished);
  }, [mixer, actions]);

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

  useFrame((_state, delta) => {
    const g = group.current;
    if (!g) return;

    const { forward, backward, left, right, sprint } = getKeys();
    const moving = forward || backward || left || right;
    const speed = sprint ? RUN_SPEED : WALK_SPEED;

    if (moving) {
      // World-space movement vector from WASD (x: strafe, z: forward/back).
      const moveX = (left ? 1 : 0) - (right ? 1 : 0);
      const moveZ = (backward ? 1 : 0) - (forward ? 1 : 0);
      const len = Math.hypot(moveX, moveZ) || 1;
      const dirX = moveX / len;
      const dirZ = moveZ / len;

      g.position.x += dirX * speed * delta;
      g.position.z += dirZ * speed * delta;

      // Smoothly rotate the character to face the movement direction.
      const targetAngle = Math.atan2(dirX, dirZ);
      let diff = targetAngle - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest angular path
      g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
    }

    // ── Animation blending ────────────────────────────────────────────
    if (isAttacking.current) {
      crossFadeTo(isGunEquipped ? "gun-fire" : "melee", 0.15, true);
    } else if (moving) {
      crossFadeTo(sprint ? "run" : "walk", 0.25);
    } else if (isGunEquipped) {
      crossFadeTo("gun", 0.25);
    } else {
      crossFadeTo("idle", 0.3);
    }

    PLAYER_WORLD_POS.copy(g.position);
    PLAYER_WORLD_ROT.y = g.rotation.y;
  });

  return (
    <group ref={group} position={PLAYER_SPAWN} dispose={null}>
      <primitive object={scene} />

      {/* Weapon attachment: portal the gun mesh directly into the bone's
          local space so it inherits the bone's animated position/rotation
          every frame. Only shown while isGunEquipped is true. */}
      {rightHand &&
        isGunEquipped &&
        createPortal(<primitive object={gunScene} />, rightHand)}
    </group>
  );
}

function PlayerFallback() {
  return (
    <group position={PLAYER_SPAWN}>
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
