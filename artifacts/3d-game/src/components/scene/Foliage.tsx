// @ts-nocheck
// Foliage.jsx
// Task 2: Efficient low-poly plant scattering for "Enigma of Alchemist"
//
// Two approaches included:
//   A) <FoliageInstanced>  → GPU instancing via drei <Instances>. ONE draw call
//      per material for hundreds of plants. Use this as the default.
//   B) <FoliageCloned>     → simple map + <Clone>. Fine for < ~30 plants or
//      multi-mesh plant models where instancing is awkward.

import React, { useMemo } from "react";
import { useGLTF, Instances, Instance, Clone } from "@react-three/drei";

/* ── Helper: generate scatter points on the island surface ────────────────
   Deterministic pseudo-random (seeded) so plants don't jump around on
   every hot-reload in Replit. Scatter in a ring so the center stays clear
   for gameplay (puzzle pedestals, NFT chests, etc.). */
function generateScatterPoints({
  count = 80,
  innerRadius = 3,
  outerRadius = 12,
  y = 0,
  seed = 42,
}) {
  const points = [];
  let s = seed;
  const rand = () => {
    // tiny seeded PRNG (mulberry32-style)
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = innerRadius + rand() * (outerRadius - innerRadius);
    points.push({
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      rotationY: rand() * Math.PI * 2,          // random facing
      scale: 0.6 + rand() * 0.8,                // size variety (0.6–1.4)
    });
  }
  return points;
}

/* ── A) INSTANCED VERSION (recommended) ────────────────────────────────────
   Extracts the geometry + material from the first mesh in the plant GLB
   and renders N copies in a single draw call. */
export function FoliageInstanced({
  url = "/models/plant_lowpoly.glb",
  count = 80,
  innerRadius = 3,
  outerRadius = 12,
  y = 0,
  seed = 42,
}) {
  const { nodes } = useGLTF(url);

  // Find the first mesh in the GLB (low-poly plants are usually one mesh).
  const mesh = useMemo(
    () => Object.values(nodes).find((n) => n.isMesh),
    [nodes]
  );

  const points = useMemo(
    () => generateScatterPoints({ count, innerRadius, outerRadius, y, seed }),
    [count, innerRadius, outerRadius, y, seed]
  );

  if (!mesh) return null;

  return (
    <Instances
      geometry={mesh.geometry}
      material={mesh.material}
      castShadow
      receiveShadow
      limit={count}
    >
      {points.map((p, i) => (
        <Instance
          key={i}
          position={p.position}
          rotation={[0, p.rotationY, 0]}
          scale={p.scale}
        />
      ))}
    </Instances>
  );
}

/* ── B) SIMPLE CLONE VERSION (small counts / multi-mesh plants) ────────────
   drei's <Clone> handles nested GLB hierarchies and lets you inject
   shadow flags into every child mesh. */
export function FoliageCloned({
  url = "/models/plant_lowpoly.glb",
  positions = [
    [4, 0, 2],
    [-5, 0, 3],
    [2, 0, -6],
    [-3, 0, -4],
    [6, 0, -1],
  ],
}) {
  const { scene } = useGLTF(url);

  return (
    <>
      {positions.map((pos, i) => (
        <Clone
          key={i}
          object={scene}
          position={pos}
          rotation={[0, (i * Math.PI) / 2.5, 0]}
          scale={0.8 + (i % 3) * 0.25}
          inject={<meshStandardMaterial />} // remove if you want original materials
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
}

useGLTF.preload("/models/plant_lowpoly.glb");

/* ── Example usage in Scene.jsx ─────────────────────────────────────────────

import { FoliageInstanced } from "./Foliage";

// 120 plants, one draw call, scattered between radius 3 and 12
<FoliageInstanced
  url="/models/plant_lowpoly.glb"
  count={120}
  innerRadius={3}
  outerRadius={12}
  y={-1.8}   // match your island's top surface height
/>

// Mix multiple plant species by stacking components with different seeds:
<FoliageInstanced url="/models/fern.glb"      count={60} seed={7}  y={-1.8} />
<FoliageInstanced url="/models/mushroom.glb"  count={30} seed={99} y={-1.8} />

PERFORMANCE NOTES:
- <Instances> = 1 draw call per plant type, regardless of count. This is
  what keeps Replit's preview from crashing at 100+ plants.
- Keep instanced counts under ~1000 per type for low-end devices.
- If a plant GLB has multiple meshes (trunk + leaves), either use
  FoliageCloned for it, or check drei's <Merged> component.
──────────────────────────────────────────────────────────────────────────── */
