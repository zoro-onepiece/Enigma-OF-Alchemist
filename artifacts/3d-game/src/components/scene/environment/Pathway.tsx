import { useMemo } from "react";
import * as THREE from "three";

/**
 * Pathway
 *
 * A winding stone path made of individual flat "stepping stone" cylinders
 * placed along a THREE.CatmullRomCurve3 through the given [x, z] waypoints.
 *
 * Y-alignment: Player.tsx's ground clamp (`GROUND_Y = 0`) holds the
 * character's feet rigidly at world y=0 — there's no step-up/terrain-
 * following, she can only ever stand exactly at y=0. The stones must
 * therefore have their walkable TOP surface at y=0 too, or her (fixed)
 * feet visibly sink into / clip through whatever sticks up above that.
 * Previously the cylinder was positioned with its BOTTOM at y=0
 * (position.y = STONE_HEIGHT/2, i.e. centered so the disc spans
 * y:[0, STONE_HEIGHT]) — its top surface sat a full 0.08 world units
 * (~12% of the character's ~0.68-unit rendered height) above where her
 * feet actually are, so she read as wading knee-deep through each stone
 * rather than standing on it. Fixed by flipping which face sits at y=0:
 * the disc's TOP now sits at STONE_SURFACE_Y (a small hair above y=0,
 * enough to avoid z-fighting with the ground plane also at y=0, but far
 * below the old 0.08 mismatch), with the rest of the cylinder buried
 * below grade (invisible, doesn't matter).
 */
export interface PathwayProps {
  waypoints: [number, number][];
  stoneCount?: number;
}

const STONE_RADIUS = 0.55;
const STONE_HEIGHT = 0.08;
// How far the stone's top surface sits above y=0 (the ground plane AND the
// character's fixed foot height) — just enough to read as a flagstone
// without reintroducing the old walk-through-it mismatch.
const STONE_SURFACE_Y = 0.02;

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
            position={[p.x, STONE_SURFACE_Y - STONE_HEIGHT / 2, p.z]}
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
