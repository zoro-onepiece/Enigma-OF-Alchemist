/**
 * JapaneseTemple
 *
 * A stylized low-poly temple built entirely from primitives: a raised stone
 * platform, vermilion pillars, a dark wood floor, a two-tier pagoda roof
 * (flared via scaled box "eave" slabs rather than a real curved mesh — cheap
 * and reads fine at low-poly distances), and two warm paper-lantern lights
 * near the entrance.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { registerBlocker } from "../../../lib/worldCollision";
import { PLAYER_WORLD_POS } from "../../3d/Player";

export interface JapaneseTempleProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  // Task C: true once puzzle.solved.size === 4 — ramps a warm gold emissive
  // glow into the platform/floor/pillar materials.
  glowActive?: boolean;
  // Task C: guards the walk-in finale trigger below so it only ever fires
  // once (mirrors the treasure chest's own claimed-gated "Press E" prompt).
  finaleClaimed?: boolean;
  // Task C: same finale sequence the treasure chest's onClaim fires
  // (gameStore.claimFinale) — this is an alternate trigger alongside that
  // one, not a replacement for it.
  onEnterInterior?: () => void;
}

const PILLAR_OFFSETS: [number, number][] = [
  [-3.2, -2.2],
  [3.2, -2.2],
  [-3.2, 2.2],
  [3.2, 2.2],
  [-3.2, 0],
  [3.2, 0],
];

// Warm gold, matching the treasure chest / temple beam's finale palette.
const GLOW_EMISSIVE = new THREE.Color("#ffd700");
const GLOW_INTENSITY_TARGET = 1.5;
// Smoothing rate for the emissive ramp — same exponential-lerp shape used
// elsewhere in this codebase (Player.tsx's camera chase) so the glow eases
// in over roughly a second instead of snapping.
const GLOW_LERP_RATE = 1.5;

export default function JapaneseTemple({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  glowActive = false,
  finaleClaimed = false,
  onEnterInterior,
}: JapaneseTempleProps) {
  // Solid platform footprint so the player can't walk through the temple
  // base/pillars — treated as one rectangular block (matches the platform's
  // boxGeometry args below).
  const [px, , pz] = position;
  const halfX = 4.5;
  const halfZ = 3;
  useEffect(() => {
    return registerBlocker({
      minX: px - halfX,
      maxX: px + halfX,
      minZ: pz - halfZ,
      maxZ: pz + halfZ,
      isSolid: () => true,
    });
  }, [px, pz]);

  const platformMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const floorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pillarMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  useFrame((_state, delta) => {
    // ── Emissive glow ramp ─────────────────────────────────────────────
    const target = glowActive ? GLOW_INTENSITY_TARGET : 0;
    const lerp = 1 - Math.exp(-GLOW_LERP_RATE * delta);
    // Performance pass: was `const mats = [platformMatRef.current,
    // floorMatRef.current, ...pillarMatRefs.current]` — a new array
    // allocated every single frame, unconditionally, just to iterate 5
    // stable refs. The refs themselves don't change after mount, so
    // there's nothing to combine into an array for in the first place —
    // applying the same update to each ref directly needs no allocation.
    if (platformMatRef.current) {
      const mat = platformMatRef.current;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * lerp;
    }
    if (floorMatRef.current) {
      const mat = floorMatRef.current;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * lerp;
    }
    for (const mat of pillarMatRefs.current) {
      if (!mat) continue;
      mat.emissiveIntensity += (target - mat.emissiveIntensity) * lerp;
    }

    // ── Walk-in finale trigger ───────────────────────────────────────────
    // Reuses the same distance/bounds-check pattern GlowingPuzzle.tsx uses
    // for pedestal proximity, sized to the temple's footprint. The solid
    // blocker above stops the player right at that footprint's edge (she
    // can never truly stand "inside" it), so the check is expanded by a
    // small margin past the blocker boundary — otherwise this could never
    // fire at all, since the collision AABB and this trigger AABB would be
    // identical and collision always wins first.
    if (!glowActive || finaleClaimed || !onEnterInterior) return;
    const margin = 0.6;
    const { x, z } = PLAYER_WORLD_POS;
    const insideFootprint =
      x > px - halfX - margin &&
      x < px + halfX + margin &&
      z > pz - halfZ - margin &&
      z < pz + halfZ + margin;
    if (insideFootprint) onEnterInterior();
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Raised stone platform base */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[9, 0.8, 6]} />
        <meshStandardMaterial
          ref={platformMatRef}
          color="#6b6b6b"
          roughness={0.9}
          emissive={GLOW_EMISSIVE}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Dark wood floor on top of the platform */}
      <mesh position={[0, 0.82, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.05, 5.4]} />
        <meshStandardMaterial
          ref={floorMatRef}
          color="#3b2a1e"
          roughness={0.7}
          emissive={GLOW_EMISSIVE}
          emissiveIntensity={0}
        />
      </mesh>

      {/* Vermilion pillars */}
      {PILLAR_OFFSETS.map(([x, z], i) => (
        <mesh key={i} position={[x, 2.2, z]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 3.2, 8]} />
          <meshStandardMaterial
            ref={(mat) => {
              pillarMatRefs.current[i] = mat;
            }}
            color="#b8302e"
            roughness={0.5}
            emissive={GLOW_EMISSIVE}
            emissiveIntensity={0}
          />
        </mesh>
      ))}

      {/* Roof — lower tier */}
      <group position={[0, 4.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[10.5, 0.35, 7.5]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
        {/* Red trim edge */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[10.8, 0.1, 7.8]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
        {/* Flared silhouette — low-poly cone rotated 45°, 4 radial segments */}
        <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[6.2, 1.4, 4]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
      </group>

      {/* Roof — upper tier, smaller, sitting on top of the lower tier's peak */}
      <group position={[0, 5.6, 0]}>
        <mesh castShadow>
          <boxGeometry args={[6.5, 0.3, 4.8]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[6.8, 0.1, 5.1]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[3.8, 1.8, 4]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
      </group>

      {/* Paper lanterns near the entrance (+Z side, facing the pathway) */}
      {[-2, 2].map((x, i) => (
        <group key={i} position={[x, 1.8, 3.4]}>
          <mesh castShadow>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#ff9d4d" emissive="#ff9d4d" emissiveIntensity={1.2} />
          </mesh>
          <pointLight color="#ff9d4d" intensity={0.9} distance={5} />
        </group>
      ))}
    </group>
  );
}
