import { Suspense, useRef, useEffect } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

export default function Merchant() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/merchant.glb");
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Agar merchant ki koi idle animation hai (jaise 'Idle' ya 'Take 001'),
    // toh wo yahan se play hogi. Action ka naam console log mein dekh lijiye ga agar na chalay.
    const actionName = Object.keys(actions)[0];
    if (actionName && actions[actionName]) {
      actions[actionName].play();
    }

    // Shadows enable karne ke liye
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });
  }, [actions, scene]);

  return (
    <Suspense fallback={null}>
      {/*
        merchant.glb bakes its own "cm-to-world-unit" correction into its
        ancestor nodes (Sketchfab_model / *.fbx), the same trick
        final_player3.glb does via its Armature node — so its true bind-pose
        height is only ~0.073 world units, NOT the raw mesh-accessor extent
        (~7.3) you'd get from a naive Box3. PLAYER_SCALE=0.4 was copied over
        from Player.tsx by analogy, but that 0.4 multiplies against a
        completely different base height, so it rendered the merchant at
        ~0.03 units tall — about 20x shorter than the player and effectively
        invisible. scale=8.6 brings it back to ~0.63 units, matching the
        player's own on-screen height (rawHeight * PLAYER_SCALE).
        position={[15, 0, 20]} is open grass, clear of the path, temple, and
        every registered tree/blocker.
      */}
      <group
        ref={group}
        position={[15, 0, 20]}
        rotation={[0, -Math.PI / 4, 0]}
        scale={8.6}
        dispose={null}
      >
        <primitive object={scene} />
      </group>
    </Suspense>
  );
}
