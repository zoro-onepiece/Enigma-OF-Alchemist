import { Suspense, useRef, useEffect, useMemo, useState } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "./Player";
import { useGameStore } from "../../store/gameStore";
import { speak } from "../../audio/voice";
import { registerBlocker } from "../../lib/worldCollision";

const INTERACT_RADIUS = 4;
export const MERCHANT_POSITION: [number, number, number] = [15, 0, 20];
const MERCHANT_SCALE = 19.5;
const COLLIDER_MARGIN = 0.4;

const DEBUG_PINK_MATERIAL = false;
const DEBUG_SPAWN_NEAR_PLAYER = false;

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/merchant.glb");
  const { actions } = useAnimations(animations, group);
  
  const [nearby, setNearby] = useState(false);
  const openShop = useGameStore((s) => s.openShop);
  const phase = useGameStore((s) => s.phase);

  const spawnPosition: [number, number, number] = DEBUG_SPAWN_NEAR_PLAYER
    ? [3, 0, 0] 
    : MERCHANT_POSITION;

  // --- Collider Logic ---
  const footprintRadius = useMemo(() => {
    scene.updateMatrixWorld(true);
    let maxDist = 0;
    scene.traverse((child) => {
      if (/foot/i.test(child.name)) {
        const p = new THREE.Vector3();
        child.getWorldPosition(p);
        maxDist = Math.max(maxDist, Math.hypot(p.x, p.z));
      }
    });
    return (maxDist || 0.15) * MERCHANT_SCALE + COLLIDER_MARGIN;
  }, [scene]);

  useEffect(() => {
    return registerBlocker({
      minX: spawnPosition[0] - footprintRadius,
      maxX: spawnPosition[0] + footprintRadius,
      minZ: spawnPosition[2] - footprintRadius,
      maxZ: spawnPosition[2] + footprintRadius,
      isSolid: () => true,
    });
  }, [footprintRadius, spawnPosition[0], spawnPosition[2]]);

  // --- Optimized Frame Logic (Voice Line & UI Trigger) ---
  useFrame(() => {
    // Lightweight proximity math (avoids Vector3 instantiation every frame)
    const dx = spawnPosition[0] - PLAYER_WORLD_POS.x;
    const dz = spawnPosition[2] - PLAYER_WORLD_POS.z;
    const distanceSquared = dx * dx + dz * dz;
    const isNear = distanceSquared <= INTERACT_RADIUS * INTERACT_RADIUS;
    
    if (isNear !== nearby) setNearby(isNear);

    // Voice line trigger: Runs only once when first approached
    if (isNear && !useGameStore.getState().hasMetMerchant) {
      useGameStore.getState().setHasMetMerchant();
      speak(
        "Ah, a new face! Come, browse my wares — alchemical trinkets, all genuine... mostly.",
        { priority: true }
      );
    }
  });

  // --- Interaction Event ---
  useEffect(() => {
    if (!nearby) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && phase !== "dead") openShop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearby, phase, openShop]);

  // --- Shared Setup ---
  useEffect(() => {
    const actionName = Object.keys(actions)[0];
    if (actionName && actions[actionName]) {
      actions[actionName].play();
    }

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (DEBUG_PINK_MATERIAL) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.5,
          });
        }
      }
    });
  }, [actions, scene]);

 

  // Proximity check against the player's live world position (same
  // PLAYER_WORLD_POS mutable ref Player.tsx updates every frame — see its
  // teleportPlayerToSpawn comment for why this stays out of gameStore).
  useFrame(() => {
    const dx = spawnPosition[0] - PLAYER_WORLD_POS.x;
    const dz = spawnPosition[2] - PLAYER_WORLD_POS.z;
    const isNear = dx * dx + dz * dz <= INTERACT_RADIUS * INTERACT_RADIUS;
    if (isNear !== nearby) setNearby(isNear);
  });

  useEffect(() => {
    if (!nearby) return;
    // Matches GlowingPuzzle.tsx's proven proximity-interact convention
    // exactly: `e.key.toLowerCase() === "e"` (not `e.code`), because
    // touchControls.ts's mobile "interact" button dispatches a synthetic
    // `KeyboardEvent("keydown", { key: "e" })` with no `code` set — an
    // `e.code === "KeyE"` check would silently never fire for touch users.
    // Gating only excludes "dead" (not "requires phase === exploring") for
    // the same reason: gameStore's default/steady-state phase during
    // ordinary exploration is "menu" (nothing transitions it to
    // "exploring" until the player's first puzzle open/close), so
    // requiring "exploring" here would block E for anyone who reaches the
    // Merchant before ever touching a puzzle.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && phase !== "dead") openShop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearby, phase, openShop]);

  return (
    <Suspense fallback={null}>
      <group
        ref={group}
        position={spawnPosition}
        rotation={[0, -Math.PI / 4, 0]}
        scale={MERCHANT_SCALE}
        dispose={null}
      >
        <primitive object={scene} />
      </group>

      {/* Teammate's Optimized UI Overlay */}
      {nearby && (
        <group position={[spawnPosition[0], spawnPosition[1] + 3, spawnPosition[2]]}>
          <Html center distanceFactor={10} pointerEvents="none">
            <div className="whitespace-nowrap rounded border border-amber-500/60 bg-black/70 px-3 py-1.5 text-xs text-white">
              Press E to Trade
            </div>
          </Html>
        </group>
      )}
    </Suspense>
  );
}
