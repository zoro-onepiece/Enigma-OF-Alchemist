import { Suspense, useRef, useEffect, useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { useGLTF, useAnimations, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree, createPortal } from "@react-three/fiber";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { resolveMove, clampToBoundary } from "../../lib/worldCollision";
import { touchMove } from "../../lib/touchControls";
import { useGameStore, type SkinId } from "../../store/gameStore";

const DEFAULT_PLAYER_MODEL = "/final_player3.glb";
const SKIN_MODEL_PATHS: Record<SkinId, string> = {
  1: "/models/player_red.glb",
  2: "/models/player_orange.glb",
  3: "/models/player_purple.glb",
};
useGLTF.preload(SKIN_MODEL_PATHS[1]);
useGLTF.preload(SKIN_MODEL_PATHS[2]);
useGLTF.preload(SKIN_MODEL_PATHS[3]);

export const PLAYER_SPAWN: [number, number, number] = [0, 0, 0];
export const PLAYER_WORLD_POS = new THREE.Vector3(...PLAYER_SPAWN);
export const PLAYER_WORLD_ROT = { y: 0 };

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

const AnimatedCharacter = forwardRef<AnimatedCharacterHandle, AnimatedCharacterProps>(
  function AnimatedCharacter({ scene, animations, position }, ref) {
    const { actions } = useAnimations(animations, scene);
    const activeAction = useRef<THREE.AnimationAction | null>(null);

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
      crossFadeTo("idle", 0.3);
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

const PlayerMesh = forwardRef<AnimatedCharacterHandle, PlayerMeshProps>(function PlayerMesh(
  { modelPath, gunScene, isGunEquipped, onRawHeight },
  ref,
) {
  const { scene: cachedScene, animations } = useGLTF(modelPath);
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

  useEffect(() => {
    playerGroupInstance = group.current;
    return () => {
      playerGroupInstance = null;
    };
  }, []);

  const equippedSkin = useGameStore((s) => s.equippedSkin);
  const modelPath = equippedSkin ? SKIN_MODEL_PATHS[equippedSkin] : DEFAULT_PLAYER_MODEL;

  const animRef = useRef<AnimatedCharacterHandle>(null);
  const [rawHeight, setRawHeight] = useState(1.7);

  const { scene: gunSceneSrc } = useGLTF("/gun.glb");
  const gunScene = useMemo(() => gunSceneSrc.clone(), [gunSceneSrc]);

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
      targetPitch.current = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch.current));
    };
    const onWheel = (e: WheelEvent) => {
      targetDistance.current += e.deltaY * ZOOM_SENSITIVITY;
      targetDistance.current = Math.max(camMinDistance, Math.min(camMaxDistance, targetDistance.current));
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

  useFrame((_state, delta) => {
    const g = group.current;
    if (!g) return;

    const camLerp = 1 - Math.exp(-CAM_SMOOTH_RATE * delta);
    yaw.current += (targetYaw.current - yaw.current) * camLerp;
    pitch.current += (targetPitch.current - pitch.current) * camLerp;
    distance.current += (targetDistance.current - distance.current) * camLerp;

    _camForward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current)).normalize();
    _camRight.crossVectors(_camForward, WORLD_UP).normalize();

    const { forward, backward, left, right, sprint } = getKeys();
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
    const moving = forward || backward || left || right || forwardInput !== 0 || strafeInput !== 0;
    const speed = sprint ? RUN_SPEED : WALK_SPEED;

    _moveDir.set(0, 0, 0).addScaledVector(_camForward, forwardInput).addScaledVector(_camRight, strafeInput);

    if (moving && _moveDir.lengthSq() > 1e-6) {
      _moveDir.normalize();
      const resolved = resolveMove(g.position.x, g.position.z, _moveDir.x * speed * delta, _moveDir.z * speed * delta);
      g.position.x = resolved.x;
      g.position.z = resolved.z;
      ({ x: g.position.x, z: g.position.z } = clampToBoundary(g.position.x, g.position.z));

      const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetAngle - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, TURN_LERP * delta);
    }

    const GROUND_Y = 0;
    if (g.position.y < GROUND_Y) g.position.y = GROUND_Y;

    _target.copy(g.position).add(camHeadOffset);
    _camOffset.set(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    ).multiplyScalar(distance.current);
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
    <group ref={group} position={PLAYER_SPAWN} scale={PLAYER_SCALE} dispose={null}>
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