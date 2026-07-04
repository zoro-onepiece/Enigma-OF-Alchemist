import { useEffect, useMemo } from "react";
import { Sparkles } from "@react-three/drei";
import { registerBlocker } from "../../../lib/worldCollision";

/**
 * CherryBlossomTree
 *
 * Fully procedural (no GLB): a bent, tapered trunk built from a short stack
 * of cylinders with decreasing radius (cheap stand-in for a bezier curve),
 * topped with a cluster of overlapping low-poly icosahedron "puffs" for the
 * canopy, plus a drei <Sparkles> instance to suggest falling petals.
 *
 * Geometries/materials are created once per mount via useMemo (not per
 * frame), and this component itself is meant to be instantiated many times
 * from GameEnvironment's scatter array — each instance is cheap because the
 * geometry args are primitive (few triangles), not shared buffers, which is
 * fine at the ~12-18 instance counts used here.
 */
export interface CherryBlossomTreeProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const CANOPY_OFFSETS: [number, number, number][] = [
  [0, 0, 0],
  [0.5, 0.15, 0.2],
  [-0.45, 0.25, -0.15],
  [0.2, 0.5, -0.4],
  [-0.3, 0.45, 0.35],
  [0.05, 0.65, 0],
];

export default function CherryBlossomTree({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: CherryBlossomTreeProps) {
  // Per-instance canopy jitter only — the trunk itself stays perfectly
  // vertical (no x-offset/z-rotation on the trunk segments); only the
  // canopy cluster shifts slightly so trees don't look identical.
  const canopyJitter = useMemo(() => {
    const seed = Math.abs(Math.sin(position[0] * 12.9898 + position[2] * 78.233));
    return (seed - 0.5) * 0.3;
  }, [position]);

  // Solid trunk footprint so the player can't walk through the tree.
  const [px, , pz] = position;
  const radius = 0.35 * scale;
  useEffect(() => {
    return registerBlocker({
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      isSolid: () => true,
    });
  }, [px, pz, radius]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Trunk — 3 tapered cylinder segments stacked straight up (all
          centered on the group's local x/z = 0), so the stem reads as a
          vertical tree trunk instead of leaning sideways. */}
      <group>
        <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.28, 1.2, 6]} />
          <meshStandardMaterial color="#4a3728" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.15, 0.22, 1.1, 6]} />
          <meshStandardMaterial color="#4a3728" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.75, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.15, 0.9, 6]} />
          <meshStandardMaterial color="#4a3728" roughness={0.9} />
        </mesh>
      </group>

      {/* Canopy — clustered low-poly icosahedron puffs, sitting right on
          top of the vertical trunk with only a small jitter for variety. */}
      <group position={[canopyJitter, 3.25, canopyJitter]}>
        {CANOPY_OFFSETS.map((offset, i) => (
          <mesh
            key={i}
            position={offset}
            castShadow
            receiveShadow
          >
            <icosahedronGeometry args={[0.75, 1]} />
            <meshStandardMaterial color="#ffb7c5" roughness={0.6} />
          </mesh>
        ))}

        {/* Falling petals */}
        <Sparkles count={15} scale={3} size={2} color="#ffe4ec" speed={0.2} />
      </group>
    </group>
  );
}
