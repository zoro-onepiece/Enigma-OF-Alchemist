/**
 * TempleBeam
 *
 * Finale visual (Task 3a): once all 4 essences are collected, a golden
 * beam of light rises from the temple platform and the ambient scene
 * lighting/fog briefly shifts warmer before settling. Self-contained —
 * mutates only its own mesh + the shared scene fog/background color via
 * useThree(), so Scene.tsx's declarative <Sky>/<fog> JSX never needs to
 * become stateful.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export interface TempleBeamProps {
  active: boolean;
  position: [number, number, number];
}

const WARM_TINT = new THREE.Color("#ffb974");

export default function TempleBeam({ active, position }: TempleBeamProps) {
  const beamRef = useRef<THREE.Mesh>(null);
  const startTime = useRef<number | null>(null);
  const { scene } = useThree();
  const originalBg = useMemo(() => new THREE.Color("#87ceeb"), []);
  const originalFog = useMemo(() => new THREE.Color("#87ceeb"), []);

  useEffect(() => {
    if (active && startTime.current === null) {
      startTime.current = performance.now();
    }
  }, [active]);

  useFrame((state) => {
    if (!active) return;
    const elapsed = startTime.current !== null ? (performance.now() - startTime.current) / 1000 : 0;

    const beam = beamRef.current;
    if (beam) {
      const growIn = Math.min(1, elapsed / 1.5);
      const scale = growIn;
      beam.scale.set(1, scale, 1);
      const mat = beam.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * growIn * (0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 2.2));
    }

    // Warm sky/fog tint: ramps in over the first ~3s, then fades back to
    // normal over the following ~6s so it reads as a "brief" shift rather
    // than a permanent recolor.
    let warmth = 0;
    if (elapsed < 3) warmth = elapsed / 3;
    else if (elapsed < 9) warmth = 1 - (elapsed - 3) / 6;
    warmth = Math.max(0, Math.min(1, warmth));

    if (scene.background instanceof THREE.Color) {
      scene.background.copy(originalBg).lerp(WARM_TINT, warmth * 0.35);
    }
    if (scene.fog && "color" in scene.fog) {
      (scene.fog as THREE.Fog).color.copy(originalFog).lerp(WARM_TINT, warmth * 0.35);
    }
  });

  if (!active) return null;

  return (
    <group position={position}>
      <mesh ref={beamRef} position={[0, 12, 0]}>
        <cylinderGeometry args={[0.6, 1.6, 24, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffd479"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 3, 0]} color="#ffd479" intensity={2.5} distance={14} />
    </group>
  );
}
