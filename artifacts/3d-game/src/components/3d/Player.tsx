// import { Suspense, useRef, useEffect, useState, useMemo } from "react";
// import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
// import { useFrame, useThree, createPortal } from "@react-three/fiber";
// import * as THREE from "three";
// import { resolveMove, clampToBoundary } from "../../lib/worldCollision";

// export const PLAYER_SPAWN: [number, number, number] = [0, 0, 0];
// export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
// export const PLAYER_WORLD_ROT = { y: 0 };

// const PLAYER_SCALE = 0.4;

// export enum PlayerControl {
//   forward = "forward",
//   backward = "backward",
//   left = "left",
//   right = "right",
//   sprint = "sprint",
//   toggleWeapon = "toggleWeapon",
// }

// export const playerKeyboardMap = [
//   { name: PlayerControl.forward, keys: ["KeyW", "ArrowUp"] },
//   { name: PlayerControl.backward, keys: ["KeyS", "ArrowDown"] },
//   { name: PlayerControl.left, keys: ["KeyA", "ArrowLeft"] },
//   { name: PlayerControl.right, keys: ["KeyD", "ArrowRight"] },
//   { name: PlayerControl.sprint, keys: ["ShiftLeft", "ShiftRight"] },
//   { name: PlayerControl.toggleWeapon, keys: ["KeyQ"] },
// ];

// useGLTF.preload("/final_player3.glb");
// useGLTF.preload("/gun.glb");

// const WALK_SPEED = 2.2;
// const RUN_SPEED = 4.5;
// const TURN_LERP = 10;

// // Camera distance/head-offset are derived at runtime from the player's
// // *actual* rendered height (see `characterHeight` below) rather than fixed
// // world-unit constants. The raw GLB is skinned, so its measured height
// // varies with PLAYER_SCALE — hardcoding "6 units away" assumed a much
// // taller character than what's actually on screen, which is why the camera
// // used to look far away and aimed above her head. These multipliers are
// // relative to character height, so "close behind" stays correct even if
// // PLAYER_SCALE or the source model changes later.
// const CAM_DISTANCE_HEIGHT_MULT = 1.8;
// const CAM_MIN_HEIGHT_MULT = 1.0;
// const CAM_MAX_HEIGHT_MULT = 3.5;
// const CAM_HEAD_HEIGHT_RATIO = 0.85;
// const MIN_PITCH = 0.15;
// const MAX_PITCH = 1.45;
// const MOUSE_SENSITIVITY = 0.0028;
// const ZOOM_SENSITIVITY = 0.0015;
// // How fast the actual camera yaw/pitch/distance chase the mouse-driven
// // target values every frame. Higher = snappier, lower = smoother/laggier.
// const CAM_SMOOTH_RATE = 8;

// // ─── Keybind → action logging ───────────────────────────────────────────
// // Purely diagnostic: logs every mapped key the player presses, along with
// // the in-game action it triggers, so behavior is easy to verify from the
// // browser console during playtesting.
// const KEYBIND_ACTIONS: Record<string, string> = {
//   KeyW: "Move forward",
//   ArrowUp: "Move forward",
//   KeyS: "Move backward",
//   ArrowDown: "Move backward",
//   KeyA: "Strafe left",
//   ArrowLeft: "Strafe left",
//   KeyD: "Strafe right",
//   ArrowRight: "Strafe right",
//   ShiftLeft: "Sprint (run speed)",
//   ShiftRight: "Sprint (run speed)",
//   KeyQ: "Toggle weapon (equip/holster gun)",
// };

// const WORLD_UP = new THREE.Vector3(0, 1, 0);

// const _camForward = new THREE.Vector3();
// const _camRight = new THREE.Vector3();
// const _moveDir = new THREE.Vector3();
// const _target = new THREE.Vector3();
// const _camOffset = new THREE.Vector3();
// const _desiredCamPos = new THREE.Vector3();

// function PlayerModel() {
//   const group = useRef<THREE.Group>(null);
//   const { camera, gl } = useThree();

//   const { scene, animations } = useGLTF("/final_player3.glb");
//   const { actions, mixer } = useAnimations(animations, group);

//   const { scene: gunSceneSrc } = useGLTF("/gun.glb");
//   const gunScene = useMemo(() => gunSceneSrc.clone(), [gunSceneSrc]);

//   // The exported GLB bakes an arbitrary translation into its root Armature
//   // node (an artifact of the Blender/Mixamo pipeline, unrelated to
//   // gameplay) — left alone, the mesh renders several units sideways from
//   // this component's own group pivot, with her feet floating above/below
//   // y=0 instead of sitting on it. We can't measure this with a Box3 like
//   // WorldModel does for the (static) forest, because Box3().setFromObject
//   // reads the *unskinned* geometry bounds and ignores skin deformation —
//   // for this skinned character that reports a bogus ~1cm-tall box. Bones
//   // don't have that problem: their world matrix already reflects the real
//   // skeleton pose via forward kinematics. So we locate the Hips bone (the
//   // horizontal center) and the lowest "toe" bone (the ground-contact
//   // point) and cancel that baked-in offset out here.
//   const { modelOffset, rawHeight } = useMemo(() => {
//     scene.updateMatrixWorld(true);
//     let hips: THREE.Object3D | null = null;
//     let lowestFootY = Infinity;
//     let headTopY = -Infinity;
//     scene.traverse((child) => {
//       const name = child.name;
//       if (!name) return;
//       if (/hips$/i.test(name)) hips = child;
//       if (/toe/i.test(name)) {
//         const p = new THREE.Vector3();
//         child.getWorldPosition(p);
//         lowestFootY = Math.min(lowestFootY, p.y);
//       }
//       if (/headtop/i.test(name)) {
//         const p = new THREE.Vector3();
//         child.getWorldPosition(p);
//         headTopY = Math.max(headTopY, p.y);
//       }
//     });

//     const pivot = new THREE.Vector3();
//     if (hips) (hips as THREE.Object3D).getWorldPosition(pivot);

//     const offset = new THREE.Vector3(
//       -pivot.x,
//       Number.isFinite(lowestFootY) ? -lowestFootY : -pivot.y,
//       -pivot.z,
//     );
//     const height =
//       Number.isFinite(headTopY) && Number.isFinite(lowestFootY)
//         ? headTopY - lowestFootY
//         : 1.7; // sane human-height fallback if bone names ever change

//     // eslint-disable-next-line no-console
//     console.log(
//       `[Player] Measured skeleton — hips=(${pivot.x.toFixed(3)}, ${pivot.y.toFixed(3)}, ${pivot.z.toFixed(3)}) ` +
//         `lowestFootY=${lowestFootY.toFixed(3)} headTopY=${headTopY.toFixed(3)} rawHeight=${height.toFixed(3)} ` +
//         `-> modelOffset=(${offset.x.toFixed(3)}, ${offset.y.toFixed(3)}, ${offset.z.toFixed(3)})`,
//     );

//     return { modelOffset: offset, rawHeight: height };
//   }, [scene]);

//   // Character height as it actually appears on screen (raw skeleton height
//   // scaled by PLAYER_SCALE) — camera framing below is derived from this so
//   // it always frames "close behind her" regardless of model/scale changes.
//   const characterHeight = rawHeight * PLAYER_SCALE;
//   const camDistanceDefault = characterHeight * CAM_DISTANCE_HEIGHT_MULT;
//   const camMinDistance = characterHeight * CAM_MIN_HEIGHT_MULT;
//   const camMaxDistance = characterHeight * CAM_MAX_HEIGHT_MULT;
//   const camHeadOffset = useMemo(
//     () => new THREE.Vector3(0, characterHeight * CAM_HEAD_HEIGHT_RATIO, 0),
//     [characterHeight],
//   );

//   const [rightHand, setRightHand] = useState<THREE.Bone | null>(null);
//   const [isGunEquipped, setIsGunEquipped] = useState(false);

//   const activeAction = useRef<THREE.AnimationAction | null>(null);

//   const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();

//   const yaw = useRef(Math.PI);
//   const pitch = useRef(0.55);
//   const distance = useRef(camDistanceDefault);
//   // Mouse drag/wheel write to these "target" values; the actual yaw/pitch/
//   // distance above chase them every frame in useFrame (see CAM_SMOOTH_RATE)
//   // so orbiting/zooming feels smoothed instead of snapping instantly.
//   const targetYaw = useRef(Math.PI);
//   const targetPitch = useRef(0.55);
//   const targetDistance = useRef(camDistanceDefault);
//   const isDragging = useRef(false);
//   const lastMouse = useRef({ x: 0, y: 0 });
//   const camInitialized = useRef(false);

//   const crossFadeTo = (name: string, duration = 0.25, once = false) => {
//     const next = actions[name];
//     if (!next || next === activeAction.current) return;

//     next.reset();
//     if (once) {
//       next.setLoop(THREE.LoopOnce, 1);
//       next.clampWhenFinished = true;
//     } else {
//       next.setLoop(THREE.LoopRepeat, Infinity);
//     }
//     next.enabled = true;
//     next.play();

//     if (activeAction.current) {
//       activeAction.current.crossFadeTo(next, duration, true);
//     } else {
//       next.fadeIn(duration);
//     }
//     activeAction.current = next;
//   };

//   useEffect(() => {
//     crossFadeTo("idle", 0.3);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [actions]);

//   useEffect(() => {
//     return subscribeKeys(
//       (state) => state.toggleWeapon,
//       (pressed) => {
//         if (pressed) setIsGunEquipped((v) => !v);
//       },
//     );
//   }, [subscribeKeys]);

//   // NOTE: mouse clicks intentionally do NOT trigger the melee animation.
//   // Previously, any left-click (window-wide, including HUD/menu buttons and
//   // the click that starts a camera-orbit drag) fired an attack, which read
//   // as a random melee swing whenever the player just wanted to look around
//   // or click a UI button. Only the mapped keyboard controls
//   // (forward/backward/strafe/sprint/toggleWeapon) drive her animation state
//   // now — everything else keeps her idle. `mixer`/`actions` are still used
//   // below for the movement/idle/gun crossfades.
//   void mixer;

//   useEffect(() => {
//     let hand: THREE.Bone | null = null;
//     scene.traverse((child) => {
//       if ((child as THREE.Mesh).isMesh) {
//         (child as THREE.Mesh).castShadow = true;
//         (child as THREE.Mesh).receiveShadow = true;
//       }
//       if (
//         (child as THREE.Bone).isBone &&
//         /(mixamorig)?right\s*hand/i.test(child.name)
//       ) {
//         hand = child as THREE.Bone;
//       }
//     });
//     setRightHand(hand);
//   }, [scene]);

//   // Right-click-drag (or left-drag) to orbit camera. Scroll wheel to zoom.
//   // Touch drag orbits the camera too — the fix here is `touch-action: none`
//   // on the canvas plus `preventDefault()` on touch pointer events. Without
//   // those, the browser's default touch handling (page scroll/pinch-zoom)
//   // intercepts single-finger drags before they ever reach `pointermove`, so
//   // mouse-drag orbiting worked but touch-drag orbiting didn't move the
//   // camera at all.
//   useEffect(() => {
//     const canvas = gl.domElement;
//     // Tell the browser this element owns all touch gestures itself instead
//     // of using them for native scroll/zoom/pull-to-refresh.
//     canvas.style.touchAction = "none";

//     const onContextMenu = (e: MouseEvent) => e.preventDefault();

//     const onPointerDown = (e: PointerEvent) => {
//       isDragging.current = true;
//       lastMouse.current = { x: e.clientX, y: e.clientY };
//       canvas.setPointerCapture(e.pointerId);
//       if (e.pointerType === "touch") e.preventDefault();
//     };
//     const onPointerUp = (e: PointerEvent) => {
//       isDragging.current = false;
//       canvas.releasePointerCapture(e.pointerId);
//     };
//     const onPointerMove = (e: PointerEvent) => {
//       if (!isDragging.current) return;
//       if (e.pointerType === "touch") e.preventDefault();
//       const dx = e.clientX - lastMouse.current.x;
//       const dy = e.clientY - lastMouse.current.y;
//       lastMouse.current = { x: e.clientX, y: e.clientY };

//       targetYaw.current -= dx * MOUSE_SENSITIVITY;
//       targetPitch.current -= dy * MOUSE_SENSITIVITY;
//       targetPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch.current));
//     };
//     const onWheel = (e: WheelEvent) => {
//       targetDistance.current += e.deltaY * ZOOM_SENSITIVITY;
//       targetDistance.current = Math.max(
//         camMinDistance,
//         Math.min(camMaxDistance, targetDistance.current),
//       );
//     };

//     canvas.addEventListener("contextmenu", onContextMenu);
//     canvas.addEventListener("pointerdown", onPointerDown);
//     window.addEventListener("pointerup", onPointerUp);
//     // `passive: false` so preventDefault() on touch pointermove actually
//     // suppresses the native scroll gesture instead of being ignored.
//     window.addEventListener("pointermove", onPointerMove, { passive: false });
//     canvas.addEventListener("wheel", onWheel, { passive: true });

//     return () => {
//       canvas.removeEventListener("contextmenu", onContextMenu);
//       canvas.removeEventListener("pointerdown", onPointerDown);
//       window.removeEventListener("pointerup", onPointerUp);
//       window.removeEventListener("pointermove", onPointerMove);
//       canvas.removeEventListener("wheel", onWheel);
//     };
//   }, [gl]);

//   // Log every mapped keybind press to the console along with the action it
//   // triggers. `e.repeat` is filtered out so holding a key doesn't spam the
//   // console — only the initial keydown transition is logged.
//   useEffect(() => {
//     const pressedKeys = new Set<string>();

//     const onKeyDown = (e: KeyboardEvent) => {
//       const action = KEYBIND_ACTIONS[e.code];
//       if (!action || e.repeat || pressedKeys.has(e.code)) return;
//       pressedKeys.add(e.code);
//       // eslint-disable-next-line no-console
//       console.log(`[Input] Key down: "${e.code}" -> ${action}`);
//     };
//     const onKeyUp = (e: KeyboardEvent) => {
//       pressedKeys.delete(e.code);
//     };

//     window.addEventListener("keydown", onKeyDown);
//     window.addEventListener("keyup", onKeyUp);
//     return () => {
//       window.removeEventListener("keydown", onKeyDown);
//       window.removeEventListener("keyup", onKeyUp);
//     };
//   }, []);

//   useFrame((_state, delta) => {
//     const g = group.current;
//     if (!g) return;

//     // Chase the mouse/wheel-driven target values instead of snapping to
//     // them instantly — smooths out orbit/zoom input.
//     const camLerp = 1 - Math.exp(-CAM_SMOOTH_RATE * delta);
//     yaw.current += (targetYaw.current - yaw.current) * camLerp;
//     pitch.current += (targetPitch.current - pitch.current) * camLerp;
//     distance.current += (targetDistance.current - distance.current) * camLerp;

//     // The orbit math below places the camera at
//     // `target + distance * (sin(yaw), ..., cos(yaw))`, i.e. that vector
//     // points from the player TOWARD the camera. The camera then looks back
//     // at the player (`camera.lookAt(_target)`), so the direction it's
//     // actually *facing* is the opposite of that offset. Movement needs to
//     // be relative to where the camera is looking, not where it's standing
//     // — using the un-negated offset here was the WASD-inversion bug (W
//     // walked toward the camera/viewer instead of away from it into the
//     // screen, and A/D were swapped along with it since strafe is derived
//     // from forward via a cross product).
//     _camForward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current)).normalize();
//     _camRight.crossVectors(_camForward, WORLD_UP).normalize();

//     const { forward, backward, left, right, sprint } = getKeys();
//     const moving = forward || backward || left || right;
//     const speed = sprint ? RUN_SPEED : WALK_SPEED;

//     const forwardInput = (forward ? 1 : 0) - (backward ? 1 : 0);
//     const strafeInput = (right ? 1 : 0) - (left ? 1 : 0);

//     _moveDir
//       .set(0, 0, 0)
//       .addScaledVector(_camForward, forwardInput)
//       .addScaledVector(_camRight, strafeInput);

//     if (moving && _moveDir.lengthSq() > 1e-6) {
//       _moveDir.normalize();
//       // Resolve against registered solid blockers (trees, the temple, etc.)
//       // so she can't clip through them — each axis is resolved
//       // independently so she slides along an obstacle instead of freezing
//       // when moving diagonally into it.
//       const resolved = resolveMove(
//         g.position.x,
//         g.position.z,
//         _moveDir.x * speed * delta,
//         _moveDir.z * speed * delta,
//       );
//       g.position.x = resolved.x;
//       g.position.z = resolved.z;
//       ({ x: g.position.x, z: g.position.z } = clampToBoundary(g.position.x, g.position.z));

//       const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
//       let diff = targetAngle - g.rotation.y;
//       diff = Math.atan2(Math.sin(diff), Math.cos(diff));
//       g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
//     }

//     // TEMP ground clamp until real collision/raycast exists.
//     const GROUND_Y = 0;
//     if (g.position.y < GROUND_Y) g.position.y = GROUND_Y;

//     // Manual spherical camera — sole owner of camera.position.
//     _target.copy(g.position).add(camHeadOffset);
//     _camOffset
//       .set(
//         Math.sin(yaw.current) * Math.cos(pitch.current),
//         Math.sin(pitch.current),
//         Math.cos(yaw.current) * Math.cos(pitch.current),
//       )
//       .multiplyScalar(distance.current);
//     _desiredCamPos.copy(_target).add(_camOffset);

//     if (!camInitialized.current) {
//       camera.position.copy(_desiredCamPos);
//       camInitialized.current = true;
//     } else {
//       camera.position.lerp(_desiredCamPos, 1 - Math.pow(0.0001, delta));
//     }
//     camera.lookAt(_target);

//     // Only the mapped movement/weapon-toggle keys drive animation state now
//     // — any other input (mouse clicks, camera drags, HUD buttons) leaves
//     // her idle instead of triggering a melee swing.
//     if (moving) {
//       crossFadeTo(sprint ? "run" : "walk", 0.25);
//     } else if (isGunEquipped) {
//       crossFadeTo("gun", 0.25);
//     } else {
//       crossFadeTo("idle", 0.3);
//     }

//     PLAYER_WORLD_POS.copy(g.position);
//     PLAYER_WORLD_ROT.y = g.rotation.y;
//   });

//   return (
//     <group ref={group} position={PLAYER_SPAWN} scale={PLAYER_SCALE} dispose={null}>
//       <primitive
//         object={scene}
//         position={[modelOffset.x, modelOffset.y, modelOffset.z]}
//       />
//       {rightHand &&
//         isGunEquipped &&
//         createPortal(<primitive object={gunScene} />, rightHand)}
//     </group>
//   );
// }

// export default function Player() {
//   return (
//     <Suspense fallback={null}>
//       <PlayerModel />
//     </Suspense>
//   );
// }
import { Suspense, useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { resolveMove, clampToBoundary } from "../../lib/worldCollision";
import { touchMove } from "../../lib/touchControls";
import { useGameStore, type SkinId } from "../../store/gameStore";

// Merchant-purchased skin -> GLB path (see ShopInventoryModal.tsx for the
// matching skin catalog). Falls back to the default rigged model when no
// skin is equipped.
const DEFAULT_PLAYER_MODEL = "/final_player3.glb";
const SKIN_MODEL_PATHS: Record<SkinId, string> = {
  1: "/models/player_red.glb", // Crimson Flare
  2: "/models/player_orange.glb", // Amber Ember
  3: "/models/player_purple.glb", // Mystic Amethyst
};
useGLTF.preload(SKIN_MODEL_PATHS[1]);
useGLTF.preload(SKIN_MODEL_PATHS[2]);
useGLTF.preload(SKIN_MODEL_PATHS[3]);

export const PLAYER_SPAWN: [number, number, number] = [0, 0, 0];
export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
export const PLAYER_WORLD_ROT = { y: 0 };

// External escape hatch for a full-run restart (Game Over -> Try Again).
// Mirrors the existing PLAYER_WORLD_POS/PLAYER_WORLD_ROT pattern (a plain
// mutable reference kept in sync from the component) rather than touching
// the useFrame movement/animation logic itself — Scene.tsx calls this
// directly from its restart handler, Player.tsx never reads gameStore.
let playerGroupInstance: THREE.Group | null = null;

export function teleportPlayerToSpawn(): void {
  if (!playerGroupInstance) return;
  playerGroupInstance.position.set(...PLAYER_SPAWN);
  playerGroupInstance.rotation.y = 0;
  PLAYER_WORLD_POS.copy(playerGroupInstance.position);
  PLAYER_WORLD_ROT.y = 0;
}

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

const CAM_DISTANCE_HEIGHT_MULT = 1.8;
const CAM_MIN_HEIGHT_MULT = 1.0;
const CAM_MAX_HEIGHT_MULT = 3.5;
const CAM_HEAD_HEIGHT_RATIO = 0.85;
const MIN_PITCH = 0.15;
const MAX_PITCH = 1.45;
const MOUSE_SENSITIVITY = 0.0028;
const ZOOM_SENSITIVITY = 0.0015;
const CAM_SMOOTH_RATE = 8;

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

export interface AnimatedCharacterHandle {
  crossFadeTo: (name: string, duration?: number, once?: boolean) => void;
}

interface AnimatedCharacterProps {
  scene: THREE.Object3D;
  animations: THREE.AnimationClip[];
  position: [number, number, number];
  modelPath: string;
}

/**
 * Owns exactly the model-swap-sensitive piece: the AnimationMixer bound to
 * whichever skin GLB is currently equipped. Rendered with `key={modelPath}`
 * by PlayerModel below, so React fully unmounts and remounts this component
 * on every skin swap rather than re-rendering it in place.
 *
 * That key is load-bearing, not decorative: drei's useAnimations creates its
 * AnimationMixer via `useState(() => new AnimationMixer())` — a lazy
 * initializer that runs exactly once per component instance and is never
 * recreated on a later re-render, no matter how many times `animations`/
 * `scene` change. Without the remount, the same mixer instance would persist
 * across every skin change, accumulating internal per-root/per-clip binding
 * state against an ancestor whose mounted child scene keeps changing
 * underneath it — which is why actions existed (their names showed up in the
 * debug log) but never visibly drove any bone on the newly swapped model.
 * Forcing a full remount here guarantees a genuinely fresh mixer, with
 * nothing left over from the previous skin, every time.
 */
const AnimatedCharacter = forwardRef<AnimatedCharacterHandle, AnimatedCharacterProps>(
  function AnimatedCharacter({ scene, animations, position, modelPath }, ref) {
    // Binding directly against `scene` (the loaded GLTF root itself, not an
    // outer wrapper) rather than an ancestor group — useAnimations accepts a
    // plain Object3D for this — so there is no ambiguity about which node
    // tree the mixer searches for bone names.
    const { actions } = useAnimations(animations, scene);
    const activeAction = useRef<THREE.AnimationAction | null>(null);

    useEffect(() => {
      console.log("🎬 Available animations for", modelPath, ":", Object.keys(actions));
    }, [actions, modelPath]);

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

    useImperativeHandle(ref, () => ({ crossFadeTo }), [actions]);

    useEffect(() => {
      // Fresh mixer every mount (see class doc above) — always a plain
      // fadeIn, never a stale cross-mixer crossFadeTo, since activeAction
      // starts null for every new instance of this component.
      crossFadeTo("idle", 0.3);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [actions]);

    return <primitive object={scene} position={position} />;
  },
);

interface PlayerMeshProps {
  modelPath: string;
  gunScene: THREE.Object3D;
  isGunEquipped: boolean;
  onRawHeight: (height: number) => void;
}

/**
 * Owns useGLTF(modelPath) itself, plus everything derived from that
 * specific scene (bone-based recentering, the right-hand bone for the gun
 * portal). Rendered by PlayerModel below inside a Suspense boundary that
 * wraps ONLY this component — not the whole PlayerModel.
 *
 * This split exists because of a real disappearing-character bug: when
 * useGLTF(modelPath) has to genuinely suspend (the skin GLB hasn't finished
 * loading yet — preloaded via useGLTF.preload, but preload only kicks off
 * the fetch, it doesn't block), whatever Suspense boundary is the nearest
 * ANCESTOR unmounts everything under it until the promise resolves. Before
 * this split, that ancestor was the outer <Suspense> wrapping the entire
 * PlayerModel (in the default-exported Player below) — so a genuine
 * suspend during a skin switch tore down group, the camera-follow useFrame,
 * and the playerGroupInstance ref registration along with the mesh, which
 * is exactly the "character disappears until pressing keys a few more
 * times" symptom: intermittent because it only happens when the target
 * GLB's preload hadn't finished yet, and timing-dependent on exactly that
 * network race. Scoping the Suspense to just this component means a
 * genuine suspend now only blanks the mesh/gun portal for a moment, while
 * group/camera/refs in PlayerModel stay mounted throughout.
 */
const PlayerMesh = forwardRef<AnimatedCharacterHandle, PlayerMeshProps>(function PlayerMesh(
  { modelPath, gunScene, isGunEquipped, onRawHeight },
  ref,
) {
  const { scene: cachedScene, animations } = useGLTF(modelPath);

  // useGLTF caches and returns the SAME scene object for a given URL on
  // every call, forever. Rendering/mutating that cached object directly
  // (as this component used to) meant every remount — including switching
  // away from and back to the same skin — reused one shared, already-bound
  // SkinnedMesh/Skeleton instance. Cloning with SkeletonUtils.clone (not a
  // plain .clone(), which leaves SkinnedMesh.skeleton pointing at the
  // ORIGINAL bones instead of the newly cloned ones — a well-known three.js
  // gotcha) gives each mount its own fully independent skeleton, so nothing
  // about a previous or concurrent mount (including SkinThumbnail.tsx's own
  // preview instance of the same URL) can leave this one's skinning broken.
  const scene = useMemo(() => cloneSkeleton(cachedScene) as THREE.Object3D, [cachedScene]);

  const [rightHand, setRightHand] = useState<THREE.Bone | null>(null);

  const { modelOffset, rawHeight } = useMemo(() => {
    scene.updateMatrixWorld(true);
    let hips: THREE.Object3D | null = null;
    let lowestFootY = Infinity;
    let headTopY = -Infinity;
    scene.traverse((child) => {
      const name = child.name;
      if (!name) return;
      if (/hips$/i.test(name)) hips = child;
      if (/toe/i.test(name)) {
        const p = new THREE.Vector3();
        child.getWorldPosition(p);
        lowestFootY = Math.min(lowestFootY, p.y);
      }
      if (/headtop/i.test(name)) {
        const p = new THREE.Vector3();
        child.getWorldPosition(p);
        headTopY = Math.max(headTopY, p.y);
      }
    });

    const pivot = new THREE.Vector3();
    if (hips) (hips as THREE.Object3D).getWorldPosition(pivot);

    const offset = new THREE.Vector3(
      -pivot.x,
      Number.isFinite(lowestFootY) ? -lowestFootY : -pivot.y,
      -pivot.z,
    );
    const height =
      Number.isFinite(headTopY) && Number.isFinite(lowestFootY)
        ? headTopY - lowestFootY
        : 1.7;

    return { modelOffset: offset, rawHeight: height };
  }, [scene]);

  useEffect(() => {
    onRawHeight(rawHeight);
  }, [rawHeight, onRawHeight]);

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

  return (
    <>
      <AnimatedCharacter
        key={modelPath}
        ref={ref}
        scene={scene}
        animations={animations}
        modelPath={modelPath}
        position={[modelOffset.x, modelOffset.y, modelOffset.z]}
      />
      {rightHand &&
        isGunEquipped &&
        createPortal(<primitive object={gunScene} />, rightHand)}
    </>
  );
});

function PlayerModel() {
  const group = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  // Register/unregister the group ref for teleportPlayerToSpawn() above —
  // purely an external-access registration, no movement/animation logic.
  useEffect(() => {
    playerGroupInstance = group.current;
    return () => {
      playerGroupInstance = null;
    };
  }, []);

  // One-off read, outside the useFrame loop — the only gameStore dependency
  // in this file, purely to pick which GLB to load (see SKIN_MODEL_PATHS
  // above). Movement/camera state stays fully decoupled from gameStore, as
  // established by teleportPlayerToSpawn below.
  const equippedSkin = useGameStore((s) => s.equippedSkin);
  const modelPath = equippedSkin ? SKIN_MODEL_PATHS[equippedSkin] : DEFAULT_PLAYER_MODEL;

  const animRef = useRef<AnimatedCharacterHandle>(null);
  const [rawHeight, setRawHeight] = useState(1.7);

  const { scene: gunSceneSrc } = useGLTF("/gun.glb");
  const gunScene = useMemo(() => gunSceneSrc.clone(), [gunSceneSrc]);

  // Quick-equip shortcuts for skins the player already owns (purchased via
  // the Merchant shop — ShopInventoryModal.tsx's Equip button drives the
  // exact same gameStore.equipSkin action, which no-ops if the skin isn't
  // owned). These are a faster alternative to opening the shop each time,
  // not a bypass: equipSkin() itself enforces ownership. Mapping: 1=Crimson
  // Flare/red (id 1), 2=Mystic Amethyst/purple (id 3), 3=Amber Ember/orange
  // (id 2), 4=back to the default final_player3 rig (always allowed, no
  // ownership required for "no skin equipped").
  useEffect(() => {
    const handleSkinKeys = (e: KeyboardEvent) => {
      const { equipSkin, setGameState } = useGameStore.getState();
      if (e.code === "Digit1") equipSkin(1);
      if (e.code === "Digit2") equipSkin(3);
      if (e.code === "Digit3") equipSkin(2);
      if (e.code === "Digit4") setGameState({ equippedSkin: null });
    };
    window.addEventListener("keydown", handleSkinKeys);
    return () => window.removeEventListener("keydown", handleSkinKeys);
  }, []);

  const characterHeight = rawHeight * PLAYER_SCALE;
  const camDistanceDefault = characterHeight * CAM_DISTANCE_HEIGHT_MULT;
  const camMinDistance = characterHeight * CAM_MIN_HEIGHT_MULT;
  const camMaxDistance = characterHeight * CAM_MAX_HEIGHT_MULT;
  const camHeadOffset = useMemo(
    () => new THREE.Vector3(0, characterHeight * CAM_HEAD_HEIGHT_RATIO, 0),
    [characterHeight],
  );

  const [isGunEquipped, setIsGunEquipped] = useState(false);

  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.55);
  const distance = useRef(camDistanceDefault);
  const targetYaw = useRef(Math.PI);
  const targetPitch = useRef(0.55);
  const targetDistance = useRef(camDistanceDefault);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const camInitialized = useRef(false);

  useEffect(() => {
    return subscribeKeys(
      (state) => state.toggleWeapon,
      (pressed) => {
        if (pressed) setIsGunEquipped((v) => !v);
      },
    );
  }, [subscribeKeys]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.touchAction = "none";

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      if (e.pointerType === "touch") e.preventDefault();
    };
    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      if (e.pointerType === "touch") e.preventDefault();
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      targetYaw.current -= dx * MOUSE_SENSITIVITY;
      targetPitch.current -= dy * MOUSE_SENSITIVITY;
      targetPitch.current = Math.max(
        MIN_PITCH,
        Math.min(MAX_PITCH, targetPitch.current),
      );
    };
    const onWheel = (e: WheelEvent) => {
      targetDistance.current += e.deltaY * ZOOM_SENSITIVITY;
      targetDistance.current = Math.max(
        camMinDistance,
        Math.min(camMaxDistance, targetDistance.current),
      );
    };

    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useEffect(() => {
    const pressedKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const action = KEYBIND_ACTIONS[e.code];
      if (!action || e.repeat || pressedKeys.has(e.code)) return;
      pressedKeys.add(e.code);
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

    const camLerp = 1 - Math.exp(-CAM_SMOOTH_RATE * delta);
    yaw.current += (targetYaw.current - yaw.current) * camLerp;
    pitch.current += (targetPitch.current - pitch.current) * camLerp;
    distance.current += (targetDistance.current - distance.current) * camLerp;

    _camForward
      .set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      .normalize();
    _camRight.crossVectors(_camForward, WORLD_UP).normalize();

    const { forward, backward, left, right, sprint } = getKeys();
    // Mobile joystick contributes the exact same -1..1 analog axes the
    // keyboard derives below, added on top so either input source (or
    // both, e.g. a keyboard user who also has a touchscreen) drives the
    // identical _moveDir math further down.
    const forwardInput = THREE.MathUtils.clamp(
      (forward ? 1 : 0) - (backward ? 1 : 0) + touchMove.z,
      -1,
      1,
    );
    const strafeInput = THREE.MathUtils.clamp(
      (right ? 1 : 0) - (left ? 1 : 0) + touchMove.x,
      -1,
      1,
    );
    const moving =
      forward ||
      backward ||
      left ||
      right ||
      forwardInput !== 0 ||
      strafeInput !== 0;
    const speed = sprint ? RUN_SPEED : WALK_SPEED;

    _moveDir
      .set(0, 0, 0)
      .addScaledVector(_camForward, forwardInput)
      .addScaledVector(_camRight, strafeInput);

    if (moving && _moveDir.lengthSq() > 1e-6) {
      _moveDir.normalize();
      const resolved = resolveMove(
        g.position.x,
        g.position.z,
        _moveDir.x * speed * delta,
        _moveDir.z * speed * delta,
      );
      g.position.x = resolved.x;
      g.position.z = resolved.z;
      ({ x: g.position.x, z: g.position.z } = clampToBoundary(
        g.position.x,
        g.position.z,
      ));

      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetAngle - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
    }

    const GROUND_Y = 0;
    if (g.position.y < GROUND_Y) g.position.y = GROUND_Y;

    _target.copy(g.position).add(camHeadOffset);
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

    if (moving) {
      animRef.current?.crossFadeTo(sprint ? "run" : "walk", 0.25);
    } else if (isGunEquipped) {
      animRef.current?.crossFadeTo("gun", 0.25);
    } else {
      animRef.current?.crossFadeTo("idle", 0.3);
    }

    PLAYER_WORLD_POS.copy(g.position);
    PLAYER_WORLD_ROT.y = g.rotation.y;
  });

  return (
    <group
      ref={group}
      position={PLAYER_SPAWN}
      scale={PLAYER_SCALE}
      dispose={null}
    >
      {/* Suspense scoped to JUST the mesh/animation-binding piece — see
          PlayerMesh's doc comment for why this must NOT wrap the whole
          PlayerModel (that was the disappearing-character bug: a genuine
          suspend here used to tear down this entire group, the
          camera-follow useFrame below, and playerGroupInstance along with
          it). */}
      <Suspense fallback={null}>
        <PlayerMesh
          key={modelPath}
          ref={animRef}
          modelPath={modelPath}
          gunScene={gunScene}
          isGunEquipped={isGunEquipped}
          onRawHeight={setRawHeight}
        />
      </Suspense>
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
