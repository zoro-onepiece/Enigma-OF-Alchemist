/**
 * SkinThumbnail
 *
 * Small, self-contained R3F <Canvas> that live-renders one of the actual
 * public/models/player_*.glb skins, auto-rotating slowly — used by
 * ShopInventoryModal in place of a static emoji/image so the Shop/Inventory
 * tabs show the real purchasable model, not a placeholder icon.
 *
 * A separate Canvas per thumbnail (rather than reusing the main game
 * Canvas) is the standard R3F pattern for an isolated DOM-embedded 3D
 * preview. Each of the 3 skins gets its own GLTF scene clone (mirrors
 * Player.tsx's gunScene clone) so the same cached GLTF can be instanced
 * into multiple independent scene graphs without fighting over one parent.
 */
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";

function SpinningSkin({ modelPath }: { modelPath: string }) {
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={spinRef}>
      {/* <Center> measures the model's real rendered bounds at runtime
          (correct even for skinned meshes, unlike a static Box3 computed
          ahead of time) so this works regardless of each GLB's authored
          origin/scale. */}
      <Center>
        <primitive object={cloned} />
      </Center>
    </group>
  );
}

export default function SkinThumbnail({ modelPath }: { modelPath: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 4, 3]} intensity={1.2} />
      <Suspense fallback={null}>
        <SpinningSkin modelPath={modelPath} />
      </Suspense>
    </Canvas>
  );
}
