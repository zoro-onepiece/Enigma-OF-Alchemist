import { useMemo } from "react";
import * as THREE from "three";
import GlbForestTree from "./GlbForestTree";
import GlbAutumnTree from "./GlbAutumnTree";
import GlbFlowerPot from "./GlbFlowerPot";
import GrassTufts from "./GrassTufts";
import DistantScenery from "./DistantScenery";
import Pathway from "./Pathway";
import GlowingPuzzle from "./GlowingPuzzle";
import JapaneseTemple from "./JapaneseTemple";
import { useGameStore } from "../../../store/gameStore";

/**
 * GameEnvironment
 *
 * Composition root for the fully code-generated "Japanese temple garden at
 * dusk" world — replaces the old GLB-loaded (`low_poly_forest.glb`) and the
 * earlier procedural-island scenes in Scene.tsx. Everything here is
 * authored at the correct scale in code, so the temple platform and
 * pathway sit flush with y=0 (the ground level Player.tsx's spawn/clamp
 * logic already assumes) with no offset hacks.
 *
 * Player, camera, the main lighting rig, Sky, and HUD are all owned by
 * Scene.tsx and intentionally NOT touched here.
 */

// Seeded PRNG (mulberry32) so the scatter layout and ground noise are
// stable across renders/hot-reloads instead of reshuffling every mount.
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The path winds from near the player's spawn toward the temple at the far
// (−Z) end of the garden.
const PATH_WAYPOINTS: [number, number][] = [
  [0, 2],
  [1.5, -6],
  [-1, -14],
  [1, -22],
  [0, -30],
];

const TEMPLE_POSITION: [number, number, number] = [0, 0, -36];

const GROUND_SIZE = 90;
const GROUND_SEGMENTS = 48;

// Keep scattered props clear of the pathway (a loose corridor around x=0)
// and the temple's footprint near z=-36.
function isClearOfPathAndTemple(x: number, z: number) {
  const nearPath = Math.abs(x) < 4.5 && z > -34 && z < 5;
  const nearTemple = Math.hypot(x, z + 36) < 7;
  return !nearPath && !nearTemple;
}

export default function GameEnvironment() {
  const puzzleSolved = useGameStore((s) => s.puzzle.solved);
  const openPuzzle = useGameStore((s) => s.openPuzzle);

  // Perfectly flat, hard ground — no per-vertex height noise. The player's
  // movement is clamped to a fixed y=0 plane (see Player.tsx), so any bump
  // here would read as either floating over dips or sinking into rises.
  // Keeping the mesh dead flat guarantees she always reads as standing
  // firmly on solid ground everywhere, not just near the path/temple.
  const groundGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(
      GROUND_SIZE,
      GROUND_SIZE,
      GROUND_SEGMENTS,
      GROUND_SEGMENTS
    );
  }, []);

  // Artist-made GLB trees (5 species: green/dry/autumn-yellow/autumn-brown/
  // stylized) replacing the old fully-procedural CherryBlossomTree /
  // QuantumTree / GreenLeafTree components — same total instance count as
  // before (16 + 5 + 12 = 33) so density/FPS stay roughly unchanged, just
  // spread evenly across the 5 real-geometry variants instead.
  const glbAutumnTrees = useMemo(() => {
    const rand = mulberry32(1010);
    const trees: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
      variant: number;
    }[] = [];
    let attempts = 0;
    while (trees.length < 33 && attempts < 1000) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 10);
      const z = (rand() - 0.5) * (GROUND_SIZE - 10) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      trees.push({
        position: [x, 0, z],
        rotationY: rand() * Math.PI * 2,
        scale: 0.85 + rand() * 0.5,
        variant: trees.length % 5,
      });
    }
    return trees;
  }, []);

  const glbForestTrees = useMemo(() => {
    const rand = mulberry32(4040);
    const trees: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
      variant: number;
    }[] = [];
    let attempts = 0;
    while (trees.length < 14 && attempts < 500) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 10);
      const z = (rand() - 0.5) * (GROUND_SIZE - 10) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      trees.push({
        position: [x, 0, z],
        rotationY: rand() * Math.PI * 2,
        scale: 1.1 + rand() * 0.7,
        variant: Math.floor(rand() * 4),
      });
    }
    return trees;
  }, []);

  const puzzlePlacements = useMemo(() => {
    // Evenly spaced along the path, just off to the side so they don't
    // block the walkable stones.
    return [
      { id: "puzzle-1", position: [2.2, 0, -4] as [number, number, number] },
      { id: "puzzle-2", position: [-2.4, 0, -13] as [number, number, number] },
      { id: "puzzle-3", position: [2.6, 0, -20] as [number, number, number] },
      { id: "puzzle-4", position: [-2.2, 0, -28] as [number, number, number] },
    ];
  }, []);

  // Small potted-flower accents lining the pathway and ringing the temple
  // base — pure ground-cover decoration (no collision), so they're allowed
  // to sit closer to the path/temple than the trees do.
  const flowerPots = useMemo(() => {
    const rand = mulberry32(5050);
    const pots: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
    }[] = [];

    // Lining both sides of the path, offset just outside the walkable
    // stones (the path corridor is roughly |x| < 2.5 around each waypoint).
    for (const [wx, wz] of PATH_WAYPOINTS) {
      for (const side of [-1, 1]) {
        if (rand() < 0.35) continue; // skip some for a natural, uneven line
        const offsetX = side * (2.8 + rand() * 1.6);
        pots.push({
          position: [wx + offsetX, 0, wz + (rand() - 0.5) * 3],
          rotationY: rand() * Math.PI * 2,
          scale: 0.8 + rand() * 0.6,
        });
      }
    }

    // A loose ring of pots around the temple's base.
    const templeRingCount = 8;
    for (let i = 0; i < templeRingCount; i++) {
      const angle = (i / templeRingCount) * Math.PI * 2;
      const r = 8 + rand() * 2;
      pots.push({
        position: [
          TEMPLE_POSITION[0] + Math.cos(angle) * r,
          0,
          TEMPLE_POSITION[2] + Math.sin(angle) * r,
        ],
        rotationY: rand() * Math.PI * 2,
        scale: 0.85 + rand() * 0.5,
      });
    }

    return pots;
  }, []);

  // Procedural grass tufts (see GrassTufts.tsx for why — no real grass GLB
  // was provided) scattered across the otherwise-bare dirt between the
  // path, temple, and trees. Single InstancedMesh draw call regardless of
  // count, so density here is free performance-wise.
  const grassTufts = useMemo(() => {
    const rand = mulberry32(6060);
    const tufts: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
    }[] = [];
    let attempts = 0;
    while (tufts.length < 260 && attempts < 3000) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 6);
      const z = (rand() - 0.5) * (GROUND_SIZE - 6) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      tufts.push({
        position: [x, 0, z],
        rotationY: rand() * Math.PI * 2,
        scale: 0.7 + rand() * 0.8,
      });
    }
    return tufts;
  }, []);

  return (
    <>
      {/* Fog now lives solely in Scene.tsx (single source of truth, matched
          to the sky color) — no second <fog> declared here. */}

      {/* Slightly stronger ambient fill on top of Scene.tsx's lighting rig,
          so the temple garden reads clearly in daylight. Warm/neutral now
          instead of the old dusk purple tint, to match the blue-sky look. */}
      <ambientLight intensity={0.25} color="#fff4e0" />

      {/* Ground — flat, hard, light sandy-yellow autumn ground */}
      <mesh
        geometry={groundGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#e2c17c" roughness={0.95} />
      </mesh>

      {/* Pathway leading to the temple */}
      <Pathway waypoints={PATH_WAYPOINTS} stoneCount={26} />

      {/* Temple at the far end of the path */}
      <JapaneseTemple position={TEMPLE_POSITION} />

      {/* Potted-flower ground cover — lines the pathway and rings the
          temple base. Purely decorative (no collision). */}
      {flowerPots.map((pot, i) => (
        <GlbFlowerPot
          key={`flower-pot-${i}`}
          position={pot.position}
          rotationY={pot.rotationY}
          scale={pot.scale}
        />
      ))}

      {/* Procedural grass tufts filling the bare dirt — see GrassTufts.tsx.
          Single instanced draw call, purely decorative. */}
      <GrassTufts placements={grassTufts} />

      {/* Autumn tree grove — artist-made GLB species (replaces the old
          fully-procedural CherryBlossomTree / QuantumTree / GreenLeafTree) */}
      {glbAutumnTrees.map((tree, i) => (
        <GlbAutumnTree
          key={`autumn-tree-${i}`}
          position={tree.position}
          rotationY={tree.rotationY}
          scale={tree.scale}
          variant={tree.variant}
        />
      ))}

      {/* Copies of the uploaded forest tree pack model */}
      {glbForestTrees.map((tree, i) => (
        <GlbForestTree
          key={`glb-tree-${i}`}
          position={tree.position}
          rotationY={tree.rotationY}
          scale={tree.scale}
          variant={tree.variant}
        />
      ))}

      {/* Glowing rune puzzles along the path */}
      {puzzlePlacements.map(({ id, position }) => (
        <GlowingPuzzle
          key={id}
          id={id}
          position={position}
          isSolved={puzzleSolved.has(id)}
          onActivate={openPuzzle}
        />
      ))}

      {/* Horizon backdrop — mountains, floating islands, extra clouds, all
          far outside the walkable ground so it never interacts with
          collision/gameplay. See DistantScenery.tsx. */}
      <DistantScenery />
    </>
  );
}
