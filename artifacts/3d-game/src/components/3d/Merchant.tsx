import { Suspense, useRef, useEffect, useMemo, useState } from "react";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "./Player";
import { useGameStore } from "../../store/gameStore";
import { speak } from "../../audio/voice";
import { registerBlocker } from "../../lib/worldCollision";

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
// Raised 15 -> 19.5 (+30%) per explicit size-increase request. footprintRadius
// below already multiplies by MERCHANT_SCALE, so this single constant change
// also proportionally grows the collider — verified by re-running the same
// foot-bone measurement technique against the raw GLB: maxDist (raw local
// units) = 0.015911 from bone L_foot_JNT_045, giving footprintRadius
// 0.6387 -> 0.7103 (both include the fixed +0.4 COLLIDER_MARGIN, which is a
// flat body-width buffer and intentionally does not scale with the model).
const MERCHANT_SCALE = 19.5;
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
  // "Press E to interact" proximity label — same Html-overlay pattern
  // GlowingPuzzle.tsx's pedestals use. Confirmed via a repo-wide grep that
  // no such overlay existed anywhere on the merchant before this (only the
  // one-time merchant_first_meet greeting voice line did).
  const [inRange, setInRange] = useState(false);

  const spawnPosition: [number, number, number] = DEBUG_SPAWN_NEAR_PLAYER
    ? [3, 0, 0] // right in front of / above player spawn — impossible to miss
    : MERCHANT_POSITION;

  // Collider radius, measured from the rig's own foot bones (L_foot_JNT /
  // R_foot_JNT — confirmed via direct GLB skin/joint inspection) rather
  // than Box3().setFromObject(scene), which — per this codebase's own
  // documented pitfall — only reflects bind pose and ignores bone
  // deformation; worse, a T/A-pose bind pose here would badly overstate
  // the footprint since arms are typically spread wide in bind pose. Feet
  // are far less affected by that than arms/hands, so their world-space
  // spread (after updateMatrixWorld) is a reliable stand-in for the
  // model's actual standing footprint. Merchant.tsx had NO collider
  // registered at all before this (confirmed via a repo-wide grep for
  // registerBlocker() — only the tree components and JapaneseTemple
  // called it) — that's the root cause of walking straight through him,
  // not a mismatched position/radius.
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
    // Fallback if the rig's naming ever changes and no "foot" bone matches.
    return (maxDist || 0.15) * MERCHANT_SCALE + COLLIDER_MARGIN;
  }, [scene]);

  // Uses spawnPosition (not the hardcoded MERCHANT_POSITION) so the
  // collider always matches wherever the model is actually rendered,
  // including under DEBUG_SPAWN_NEAR_PLAYER.
  useEffect(() => {
    return registerBlocker({
      minX: spawnPosition[0] - footprintRadius,
      maxX: spawnPosition[0] + footprintRadius,
      minZ: spawnPosition[2] - footprintRadius,
      maxZ: spawnPosition[2] + footprintRadius,
      isSolid: () => true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [footprintRadius, spawnPosition[0], spawnPosition[2]]);

  // merchant_first_meet — fires once ever (gameStore.hasMetMerchant),
  // the first time the player comes within range. Reads/writes the store
  // via getState() inside the frame loop rather than subscribing, so this
  // doesn't re-render every frame and always sees the latest flag — same
  // pattern GlowingPuzzle.tsx's key listener uses for gameStore.phase.
  // 🔍 TEMP DEBUG (item 1 re-investigation) — logs the live computed
  // distance once/second regardless of range, plus every inRange
  // true/false transition immediately. Remove once the real cause of the
  // missing "Press E" label is confirmed from actual console output.
  const lastLogRef = useRef(0);

  useFrame((state) => {
    const distance = PLAYER_WORLD_POS.distanceTo(merchantPos);
    const nowInRange = distance <= PROXIMITY_RANGE;

    if (state.clock.elapsedTime - lastLogRef.current >= 1) {
      lastLogRef.current = state.clock.elapsedTime;
      // eslint-disable-next-line no-console
      console.log(
        `[Merchant DEBUG] player=(${PLAYER_WORLD_POS.x.toFixed(2)}, ${PLAYER_WORLD_POS.z.toFixed(2)}) ` +
          `merchant=(${merchantPos.x.toFixed(2)}, ${merchantPos.z.toFixed(2)}) distance=${distance.toFixed(2)} ` +
          `PROXIMITY_RANGE=${PROXIMITY_RANGE} nowInRange=${nowInRange} inRangeState=${inRange}`,
      );
    }

    if (nowInRange !== inRange) {
      // eslint-disable-next-line no-console
      console.log(`[Merchant DEBUG] inRange transition: ${inRange} -> ${nowInRange}`);
      setInRange(nowInRange);
    }

    if (useGameStore.getState().hasMetMerchant) return;
    if (nowInRange) {
      useGameStore.getState().setHasMetMerchant();
      // Routed through speak() (narrator TTS), not playVoiceLine() (the
      // character's pre-recorded MP3 bank) — text unchanged, only the
      // playback mechanism moved to match GlowingPuzzle's shrine hint.
      speak(
        "Ah, a new face! Come, browse my wares — alchemical trinkets, all genuine... mostly.",
        { priority: true },
      );
    }
  });

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
            color: 0xff00ff, // bright pink — impossible to miss
            emissive: 0xff00ff,
            emissiveIntensity: 0.5,
          });
        }
      }
    });

    // 🔍 DEBUG LOGGING — merchant kahan spawn hua aur uski actual size kya hai
    // setTimeout(() => {
    //   if (group.current) {
    //     const box = new THREE.Box3().setFromObject(group.current);
    //     const size = new THREE.Vector3();
    //     box.getSize(size);
    //     const center = new THREE.Vector3();
    //     box.getCenter(center);

    //     console.log("🧑‍💼 ====== MERCHANT DEBUG ====== 🧑‍💼");
    //     console.log("group.current exists:", !!group.current);
    //     console.log("scene children count:", scene.children.length);
    //     console.log("World Position (group):", group.current.position);
    //     console.log(
    //       "World Center (bounding box):",
    //       `X: ${center.x.toFixed(2)}, Y: ${center.y.toFixed(2)}, Z: ${center.z.toFixed(2)}`,
    //     );
    //     console.log(
    //       "Actual World Size:",
    //       `W: ${size.x.toFixed(3)}, H: ${size.y.toFixed(3)}, D: ${size.z.toFixed(3)}`,
    //     );
    //     console.log(
    //       "Is size zero/tiny? (mesh missing or scale wrong):",
    //       size.x < 0.01 && size.y < 0.01 && size.z < 0.01,
    //     );
    //     console.log("Visible flag:", group.current.visible);
    //     console.log("Mesh names found:");
    //     scene.traverse((child) => {
    //       if ((child as THREE.Mesh).isMesh) {
    //         console.log("  -", child.name, "| visible:", child.visible);
    //       }
    //     });
    //     console.log("================================");
    //   } else {
    //     console.error(
    //       "❌ Merchant group.current is NULL — component may not be mounted!",
    //     );
    //   }
    // }, 1500);
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

      {/* "Press E to interact" label — placed in a separate, unscaled
          sibling group (not nested inside the scaled model group above,
          which would multiply this position by MERCHANT_SCALE too) at a
          world-space height measured directly from the GLB: the model's
          head sits at ~1.36 world units tall after scaling, so 1.85 clears
          it comfortably. */}
      {inRange && (
        <Html center distanceFactor={8} position={[spawnPosition[0], 1.85, spawnPosition[2]]}>
          <div className="bg-black/70 text-white text-xs lg:text-base xl:text-lg px-2 py-1 lg:px-4 lg:py-2 rounded lg:rounded-lg pointer-events-none whitespace-nowrap">
            Press E to interact
          </div>
        </Html>
      )}
    </Suspense>
  );
}