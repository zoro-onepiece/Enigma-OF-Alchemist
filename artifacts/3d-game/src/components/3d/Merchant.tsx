import { Suspense, useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

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
    </Suspense>
  );
}