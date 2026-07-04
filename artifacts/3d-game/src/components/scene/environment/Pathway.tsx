import { useMemo } from "react";
import * as THREE from "three";

/**
 * Pathway
 *
 * A winding stone path made of individual flat "stepping stone" cylinders
 * placed along a THREE.CatmullRomCurve3 through the given [x, z] waypoints.
 * Stones sit flush with y=0 (the walkable ground level Player.tsx expects)
 * with only a hair of thickness above it, so they read as flagstones, not
 * obstacles.
 */
export interface PathwayProps {
  waypoints: [number, number][];
  stoneCount?: number;
}

const STONE_RADIUS = 0.55;
const STONE_HEIGHT = 0.08;

export default function Pathway({ waypoints, stoneCount = 24 }: PathwayProps) {
  const stonePositions = useMemo(() => {
    const points = waypoints.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const curve = new THREE.CatmullRomCurve3(points);
    return curve.getPoints(stoneCount - 1);
  }, [waypoints, stoneCount]);

  return (
    <group>
      {stonePositions.map((p, i) => {
        // Slight per-stone jitter/rotation so the path doesn't look like a
        // perfectly uniform conveyor belt of identical discs.
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const jitter = seed - Math.floor(seed);
        const rot = jitter * Math.PI * 2;
        const scaleVariance = 0.85 + jitter * 0.3;

        return (
          <mesh
            key={i}
            position={[p.x, STONE_HEIGHT / 2, p.z]}
            rotation={[0, rot, 0]}
            scale={[scaleVariance, 1, scaleVariance]}
            receiveShadow
            castShadow
          >
            <cylinderGeometry args={[STONE_RADIUS, STONE_RADIUS * 0.92, STONE_HEIGHT, 7]} />
            <meshStandardMaterial color="#8a8a8a" roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
