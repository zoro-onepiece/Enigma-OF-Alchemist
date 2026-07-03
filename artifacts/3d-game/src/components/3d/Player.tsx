import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import * as THREE from "three";

export const PLAYER_SPAWN: [number, number, number] = [0, 0, 0];
export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
export const PLAYER_WORLD_ROT = { y: 0 };

const PLAYER_SCALE = 0.4;

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
const TURN_LERP = 10;

const CAM_DISTANCE_DEFAULT = 6;
const CAM_MIN_DISTANCE = 3;
const CAM_MAX_DISTANCE = 12;
const CAM_HEAD_OFFSET = new THREE.Vector3(0, 1.5, 0);
const MIN_PITCH = 0.15;
const MAX_PITCH = 1.45;
const MOUSE_SENSITIVITY = 0.0028;
const ZOOM_SENSITIVITY = 0.0015;
// How fast the actual camera yaw/pitch/distance chase the mouse-driven
// target values every frame. Higher = snappier, lower = smoother/laggier.
const CAM_SMOOTH_RATE = 8;

// ─── Keybind → action logging ───────────────────────────────────────────
// Purely diagnostic: logs every mapped key the player presses, along with
// the in-game action it triggers, so behavior is easy to verify from the
// browser console during playtesting.
const KEYBIND_ACTIONS: Record<string, string> = {
  KeyW: "Move forward",
  ArrowUp: "Move forward",
  KeyS: "Move backward",
  ArrowDown: "Move backward",
  KeyA: "Strafe left",
  ArrowLeft: "Strafe left",
  KeyD: "Strafe right",
  ArrowRight: "Strafe right",
  ShiftLeft: "Sprint (run speed)",
  ShiftRight: "Sprint (run speed)",
  KeyQ: "Toggle weapon (equip/holster gun)",
};

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

function PlayerModel() {
  const group = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  const { scene, animations } = useGLTF("/final_player3.glb");
  const { actions, mixer } = useAnimations(animations, group);

  const { scene: gunSceneSrc } = useGLTF("/gun.glb");
  const gunScene = useMemo(() => gunSceneSrc.clone(), [gunSceneSrc]);

  const [rightHand, setRightHand] = useState<THREE.Bone | null>(null);
  const [isGunEquipped, setIsGunEquipped] = useState(false);

  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const isAttacking = useRef(false);

  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.55);
  const distance = useRef(CAM_DISTANCE_DEFAULT);
  // Mouse drag/wheel write to these "target" values; the actual yaw/pitch/
  // distance above chase them every frame in useFrame (see CAM_SMOOTH_RATE)
  // so orbiting/zooming feels smoothed instead of snapping instantly.
  const targetYaw = useRef(Math.PI);
  const targetPitch = useRef(0.55);
  const targetDistance = useRef(CAM_DISTANCE_DEFAULT);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const camInitialized = useRef(false);

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

  useEffect(() => {
    crossFadeTo("idle", 0.3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useEffect(() => {
    return subscribeKeys(
      (state) => state.toggleWeapon,
      (pressed) => {
        if (pressed) setIsGunEquipped((v) => !v);
      },
    );
  }, [subscribeKeys]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (isAttacking.current) return;
      isAttacking.current = true;
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, []);

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

  // Right-click-drag (or left-drag) to orbit camera. Scroll wheel to zoom.
  useEffect(() => {
    const canvas = gl.domElement;

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      targetYaw.current -= dx * MOUSE_SENSITIVITY;
      targetPitch.current -= dy * MOUSE_SENSITIVITY;
      targetPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch.current));
    };
    const onWheel = (e: WheelEvent) => {
      targetDistance.current += e.deltaY * ZOOM_SENSITIVITY;
      targetDistance.current = Math.max(
        CAM_MIN_DISTANCE,
        Math.min(CAM_MAX_DISTANCE, targetDistance.current),
      );
    };

    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  // Log every mapped keybind press to the console along with the action it
  // triggers. `e.repeat` is filtered out so holding a key doesn't spam the
  // console — only the initial keydown transition is logged.
  useEffect(() => {
    const pressedKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEYBIND_ACTIONS[e.code];
      if (!action || e.repeat || pressedKeys.has(e.code)) return;
      pressedKeys.add(e.code);
      // eslint-disable-next-line no-console
      console.log(`[Input] Key down: "${e.code}" -> ${action}`);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_state, delta) => {
    const g = group.current;
    if (!g) return;

    // Chase the mouse/wheel-driven target values instead of snapping to
    // them instantly — smooths out orbit/zoom input.
    const camLerp = 1 - Math.exp(-CAM_SMOOTH_RATE * delta);
    yaw.current += (targetYaw.current - yaw.current) * camLerp;
    pitch.current += (targetPitch.current - pitch.current) * camLerp;
    distance.current += (targetDistance.current - distance.current) * camLerp;

    _camForward.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).normalize();
    _camRight.crossVectors(_camForward, WORLD_UP).normalize();

    const { forward, backward, left, right, sprint } = getKeys();
    const moving = forward || backward || left || right;
    const speed = sprint ? RUN_SPEED : WALK_SPEED;

    const forwardInput = (forward ? 1 : 0) - (backward ? 1 : 0);
    const strafeInput = (right ? 1 : 0) - (left ? 1 : 0);

    _moveDir
      .set(0, 0, 0)
      .addScaledVector(_camForward, forwardInput)
      .addScaledVector(_camRight, strafeInput);

    if (moving && _moveDir.lengthSq() > 1e-6) {
      _moveDir.normalize();
      g.position.addScaledVector(_moveDir, speed * delta);

      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetAngle - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
    }

    // TEMP ground clamp until real collision/raycast exists.
    const GROUND_Y = 0;
    if (g.position.y < GROUND_Y) g.position.y = GROUND_Y;

    // Manual spherical camera — sole owner of camera.position.
    _target.copy(g.position).add(CAM_HEAD_OFFSET);
    _camOffset
      .set(
        Math.sin(yaw.current) * Math.cos(pitch.current),
        Math.sin(pitch.current),
        Math.cos(yaw.current) * Math.cos(pitch.current),
      )
      .multiplyScalar(distance.current);
    _desiredCamPos.copy(_target).add(_camOffset);

    if (!camInitialized.current) {
      camera.position.copy(_desiredCamPos);
      camInitialized.current = true;
    } else {
      camera.position.lerp(_desiredCamPos, 1 - Math.pow(0.0001, delta));
    }
    camera.lookAt(_target);

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
