import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import * as THREE from "three";

// Character now spawns at the world origin — scale/position tuned for a
// Fortnite-style camera-relative controller (see useFrame below).
export const PLAYER_SPAWN: [number, number, number] = [0, 0, 0];
export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
export const PLAYER_WORLD_ROT = { y: 0 };

// The GLB is modeled at a much larger scale than the scene expects —
// 0.4 brings her in line with the surrounding trees/geometry.
const PLAYER_SCALE = 0.4;

// ─── Keyboard control map ──────────────────────────────────────────────────
// Consumed by <KeyboardControls map={playerKeyboardMap}> wrapping the
// <Canvas> in Scene.tsx. W/A/S/D are camera-relative (forward = "away from
// camera", not a fixed world axis) — see the movement math in useFrame.
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

const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Reusable scratch vectors (avoid per-frame GC pressure).
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _lookAtTarget = new THREE.Vector3();

function PlayerModel() {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();

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
      // ── Camera-relative movement ─────────────────────────────────────
      // "Forward" is whatever direction the camera is currently facing
      // (flattened to the ground plane), not a fixed world axis. Rotating
      // the camera with the mouse rotates what W/A/S/D mean, like Fortnite.
      camera.getWorldDirection(_camForward);
      _camForward.y = 0;
      _camForward.normalize();
      _camRight.crossVectors(_camForward, WORLD_UP).normalize();

      const forwardInput = (forward ? 1 : 0) - (backward ? 1 : 0);
      const strafeInput = (right ? 1 : 0) - (left ? 1 : 0);

      _moveDir
        .set(0, 0, 0)
        .addScaledVector(_camForward, forwardInput)
        .addScaledVector(_camRight, strafeInput);

      if (_moveDir.lengthSq() > 1e-6) {
        _moveDir.normalize();

        g.position.addScaledVector(_moveDir, speed * delta);

        // Smoothly rotate the character to face the movement direction.
        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        let diff = targetAngle - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // shortest angular path
        g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
      }
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
    <group ref={group} position={PLAYER_SPAWN} scale={PLAYER_SCALE} dispose={null}>
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

export default function Player() {
  return (
    <Suspense fallback={null}>
      <PlayerModel />
    </Suspense>
  );
}
