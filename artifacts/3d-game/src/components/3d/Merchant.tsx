import { Suspense, useRef, useEffect, useMemo, useState } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "./Player";
import { useGameStore } from "../../store/gameStore";
import { playVoiceLine } from "../../audio/voice";
import { registerBlocker } from "../../lib/worldCollision";

// How close (world units, XZ-plane) the player must be to see the "Press E
// to Trade" prompt and have E open the shop.
const INTERACT_RADIUS = 4;

// Exported so MinimapOverlay.tsx can plot the merchant's marker using the
// exact same coordinate the 3D scene actually places him at — same pattern
// as TEMPLE_POSITION/PUZZLE_PLACEMENTS in GameEnvironment.tsx.
export const MERCHANT_POSITION: [number, number, number] = [15, 0, 20];

// Same proximity-detection shape as GlowingPuzzle.tsx's pedestals (distance
// to PLAYER_WORLD_POS, checked every frame) — didn't exist on the merchant
// at all before this; needed so merchant_first_meet has something to
// trigger off.
const PROXIMITY_RANGE = 4;
const merchantPos = new THREE.Vector3(...MERCHANT_POSITION);
const MERCHANT_SCALE = 15;
// Small margin added on top of the measured foot-bone spread so the
// collider covers the model's actual body width, not just the exact foot
// points.
const COLLIDER_MARGIN = 0.4;

// 🔍 DEBUG TOGGLE — set to true to force a bright pink material on every
// mesh (confirms the model itself is actually rendering, independent of
// its real materials/textures). Set back to false once merchant is
// confirmed visible with its real look.
const DEBUG_PINK_MATERIAL = false;

// 🔍 DEBUG TOGGLE — set to true to spawn him right next to the player
// spawn point instead of his real position, to rule out "he's just
// hidden behind something at [15,0,20]". Set back to false afterward.
const DEBUG_SPAWN_NEAR_PLAYER = false;

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/merchant.glb");
  const { actions } = useAnimations(animations, group);

  const [nearby, setNearby] = useState(false);
  const openInventory = useGameStore((s) => s.openInventory);
  const phase = useGameStore((s) => s.phase);

  // Yeh line duplicate thi, ab siraf ek dafa hai
  const spawnPosition: [number, number, number] = DEBUG_SPAWN_NEAR_PLAYER
    ? [3, 0, 0] // right in front of / above player spawn — impossible to miss
    : MERCHANT_POSITION;

  // --- Robin's Logic: Collider and Voice Lines ---
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

  useFrame(() => {
    if (useGameStore.getState().hasMetMerchant) return;
    const distance = PLAYER_WORLD_POS.distanceTo(merchantPos);
    if (distance <= PROXIMITY_RANGE) {
      useGameStore.getState().setHasMetMerchant();
      playVoiceLine(
        "merchant_first_meet",
        "Ah, a new face! Come, browse my wares — alchemical trinkets, all genuine... mostly.",
        { priority: true },
      );
    }
  });

  // --- Asra's Logic: E to Interact and Open Shop ---
  useFrame(() => {
    const dx = spawnPosition[0] - PLAYER_WORLD_POS.x;
    const dz = spawnPosition[2] - PLAYER_WORLD_POS.z;
    const isNear = dx * dx + dz * dz <= INTERACT_RADIUS * INTERACT_RADIUS;
    if (isNear !== nearby) setNearby(isNear);
  });

  useEffect(() => {
    if (!nearby) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "e" && phase !== "dead") openInventory();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearby, phase, openInventory]);

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