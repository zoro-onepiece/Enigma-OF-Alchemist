/**
 * SparkleFountain
 *
 * Reusable golden particle fountain built on a single THREE.Points buffer
 * (no libraries). Used for (a) the gentle sparkle rising from each solved
 * GlowingPuzzle pedestal and (b) the denser sparkle cloud around the
 * finale treasure chest. Particles rise from `height` 0 up to `height`,
 * drifting slightly sideways, then wrap back to the bottom — a cheap,
 * always-looping fountain with a fixed particle budget (no allocation in
 * the render loop).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface SparkleFountainProps {
  count?: number;
  radius?: number;
  height?: number;
  color?: string;
  size?: number;
  speed?: number;
}

export default function SparkleFountain({
  count = 60,
  radius = 0.45,
  height = 1.8,
  color = "#facc15",
  size = 0.06,
  speed = 0.55,
}: SparkleFountainProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3); // [angle, radiusFrac, phaseOffset]
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const y = Math.random() * height;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;
      seeds[i * 3] = angle;
      seeds[i * 3 + 1] = r;
      seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
    }
    return { positions, seeds };
  }, [count, radius, height]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      let y = arr[i * 3 + 1] + speed * delta;
      if (y > height) y -= height;
      arr[i * 3 + 1] = y;

      const angle = seeds[i * 3];
      const r = seeds[i * 3 + 1];
      const phase = seeds[i * 3 + 2];
      const wobble = Math.sin(t * 0.8 + phase) * 0.08;
      arr[i * 3] = Math.cos(angle) * r + wobble;
      arr[i * 3 + 2] = Math.sin(angle) * r + wobble;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
