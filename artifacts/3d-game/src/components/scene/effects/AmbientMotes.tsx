/**
 * AmbientMotes
 *
 * Slow-drifting firefly/pollen motes across the island — pure ambience,
 * no gameplay meaning. One THREE.Points buffer, warm white/gold, gentle
 * sine drift + slow rise/fall so it never looks mechanical. Particle
 * count intentionally capped (default 200) to stay well within the
 * "no noticeable FPS drop" budget alongside the existing flower field /
 * tree instancing.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";

// Performance pass: this ran its full 220-particle loop (3 trig calls
// each, ~660/frame) unconditionally, even when the player is far enough
// from the island's center that these motes aren't visible or relevant.
// Gated on player distance from world origin — skip the entire loop (and
// hide the points mesh, so it's not still submitted to the GPU either)
// once the player wanders past this radius.
const ANIMATE_RADIUS = 80;
const ANIMATE_RADIUS_SQ = ANIMATE_RADIUS * ANIMATE_RADIUS;

export interface AmbientMotesProps {
  count?: number;
  spread?: number;
  minHeight?: number;
  maxHeight?: number;
}

export default function AmbientMotes({
  count = 220,
  spread = 130,
  minHeight = 0.6,
  maxHeight = 6,
}: AmbientMotesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4); // [phaseX, phaseZ, phaseY, baseY]
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * spread * 2;
      const z = (Math.random() - 0.5) * spread * 2 - spread * 0.3;
      const baseY = minHeight + Math.random() * (maxHeight - minHeight);
      positions[i * 3] = x;
      positions[i * 3 + 1] = baseY;
      positions[i * 3 + 2] = z;
      seeds[i * 4] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 2] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 3] = baseY;
    }
    return { positions, seeds };
  }, [count, spread, minHeight, maxHeight]);

  const basePositions = useMemo(() => positions.slice(), [positions]);

  useFrame((state) => {
    const points = pointsRef.current;
    if (!points) return;

    const dx = PLAYER_WORLD_POS.x;
    const dz = PLAYER_WORLD_POS.z;
    if (dx * dx + dz * dz > ANIMATE_RADIUS_SQ) {
      points.visible = false;
      return;
    }
    points.visible = true;

    const posAttr = points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const px = basePositions[i * 3];
      const pz = basePositions[i * 3 + 2];
      const phaseX = seeds[i * 4];
      const phaseZ = seeds[i * 4 + 1];
      const phaseY = seeds[i * 4 + 2];
      const baseY = seeds[i * 4 + 3];

      arr[i * 3] = px + Math.sin(t * 0.15 + phaseX) * 1.4;
      arr[i * 3 + 1] = baseY + Math.sin(t * 0.25 + phaseY) * 0.6;
      arr[i * 3 + 2] = pz + Math.cos(t * 0.13 + phaseZ) * 1.4;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#fff2c9"
        size={0.09}
        transparent
        opacity={0.55}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
