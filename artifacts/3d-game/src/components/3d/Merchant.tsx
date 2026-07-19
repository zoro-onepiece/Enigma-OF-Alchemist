import { Suspense, useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../store/gameStore";
import { PLAYER_WORLD_POS } from "./Player";

// How close (world units, XZ-plane) the player must be to see the "Press E
// to Trade" prompt and have E open the shop.
const INTERACT_RADIUS = 4;

// Exported so MinimapOverlay.tsx can plot the merchant's marker using the
// exact same coordinate the 3D scene actually places him at — same pattern
// as TEMPLE_POSITION/PUZZLE_PLACEMENTS in GameEnvironment.tsx.
export const MERCHANT_POSITION: [number, number, number] = [15, 0, 20];

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
  const openShop = useGameStore((s) => s.openShop);
  const phase = useGameStore((s) => s.phase);

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

  const spawnPosition: [number, number, number] = DEBUG_SPAWN_NEAR_PLAYER
    ? [3, 0, 0] // right in front of / above player spawn — impossible to miss
    : MERCHANT_POSITION;

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
        scale={15}
        dispose={null}
      >
        <primitive object={scene} />
      </group>
      {nearby && (
        // Outside the scaled group above (scale={15} would blow up a local
        // position offset) so this floats a fixed world-space distance
        // above the merchant's head regardless of his model's scale.
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