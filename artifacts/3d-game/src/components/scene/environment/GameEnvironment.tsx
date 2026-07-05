import { useMemo } from "react";
import * as THREE from "three";
import GlbForestTree from "./GlbForestTree";
import GlbAutumnTree from "./GlbAutumnTree";
import GlbFlowerPot from "./GlbFlowerPot";
import FlowerField from "./FlowerField";
import DistantScenery from "./DistantScenery";
import Pathway from "./Pathway";
import GlowingPuzzle from "./GlowingPuzzle";
import JapaneseTemple from "./JapaneseTemple";
import TempleBeam from "./TempleBeam";
import TreasureChest from "./TreasureChest";
import Wildlife from "./Wildlife";
import FootstepAudio from "./FootstepAudio";
import AmbientMotes from "../effects/AmbientMotes";
import { useGameStore } from "../../../store/gameStore";
import { ISLAND_SCALE, GROUND_SIZE, BOUNDARY_RADIUS } from "../../../lib/worldCollision";
import { playSfx } from "../../../audio/sounds";

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
// (−Z) end of the garden. Raw (pre-scale) waypoints/positions are kept as
// the original hand-tuned layout, then multiplied by ISLAND_SCALE below so
// the whole garden spreads outward from the origin (where the player still
// spawns) without needing to re-tune every coordinate by hand.
const RAW_PATH_WAYPOINTS: [number, number][] = [
  [0, 2],
  [1.5, -6],
  [-1, -14],
  [1, -22],
  [0, -30],
];
const PATH_WAYPOINTS: [number, number][] = RAW_PATH_WAYPOINTS.map(
  ([x, z]) => [x * ISLAND_SCALE, z * ISLAND_SCALE]
);

const RAW_TEMPLE_POSITION: [number, number] = [0, -36];
const TEMPLE_POSITION: [number, number, number] = [
  RAW_TEMPLE_POSITION[0] * ISLAND_SCALE,
  0,
  RAW_TEMPLE_POSITION[1] * ISLAND_SCALE,
];

const GROUND_SEGMENTS = 48;

// Keep scattered props clear of the pathway (a loose corridor around x=0)
// and the temple's footprint — corridor/footprint checks scale with
// ISLAND_SCALE too since the path/temple positions moved outward with it.
function isClearOfPathAndTemple(x: number, z: number) {
  const nearPath =
    Math.abs(x) < 4.5 * ISLAND_SCALE &&
    z > -34 * ISLAND_SCALE &&
    z < 5 * ISLAND_SCALE;
  const nearTemple = Math.hypot(x - TEMPLE_POSITION[0], z - TEMPLE_POSITION[2]) < 7;
  return !nearPath && !nearTemple;
}

// Puzzle pedestal positions, duplicated here (rather than derived from
// puzzlePlacements at call time) so the ground-cover exclusion check can be
// a plain function used inside useMemo generators below.
const RAW_PUZZLE_POSITIONS: [number, number][] = [
  [2.2, -4],
  [-2.4, -13],
  [2.6, -20],
  [-2.2, -28],
];
const PUZZLE_POSITIONS: [number, number][] = RAW_PUZZLE_POSITIONS.map(
  ([x, z]) => [x * ISLAND_SCALE, z * ISLAND_SCALE]
);
const PUZZLE_CLEAR_RADIUS = 1.8;

// Extra exclusion for dense ground cover (grass/flowers only) — on top of
// the path/temple clearing, also keep a small clear radius around each
// puzzle pedestal so tufts/flowers don't clip through them.
function isClearForGroundCover(x: number, z: number) {
  if (!isClearOfPathAndTemple(x, z)) return false;
  for (const [px, pz] of PUZZLE_POSITIONS) {
    if (Math.hypot(x - px, z - pz) < PUZZLE_CLEAR_RADIUS) return false;
  }
  return true;
}

// Just off the path, between the pathway and the temple platform, so the
// chest visually reads as "waiting in front of the temple" once it appears.
const CHEST_POSITION: [number, number, number] = [
  TEMPLE_POSITION[0],
  0,
  TEMPLE_POSITION[2] + 6.5,
];

export default function GameEnvironment() {
  const puzzleSolved = useGameStore((s) => s.puzzle.solved);
  const openPuzzle = useGameStore((s) => s.openPuzzle);
  const finaleClaimed = useGameStore((s) => s.finaleClaimed);
  const claimFinale = useGameStore((s) => s.claimFinale);
  const allEssencesCollected = puzzleSolved.size >= 4;

  // Opening a puzzle is the pedestal/proximity interaction (this file), not
  // the mini-game logic itself (that lives in PuzzleModal.tsx + the
  // individual game components), so playing the "puzzle-open" click SFX
  // here doesn't touch puzzle mini-game logic.
  const handleActivate = (id: string) => {
    playSfx("click", 0.5);
    openPuzzle(id);
  };

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
    // Linear (not area) scale-up with the island so the bigger garden stays
    // well-treed without ballooning draw calls/collider registrations.
    const count = Math.round(33 * ISLAND_SCALE);
    let attempts = 0;
    while (trees.length < count && attempts < count * 30) {
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
    const count = Math.round(14 * ISLAND_SCALE);
    let attempts = 0;
    while (trees.length < count && attempts < count * 35) {
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

  // A sparse ring of trees just outside the walkable boundary, so the edge
  // of the world reads as "the garden fades into a tree line" rather than
  // an abrupt drop-off. Purely decorative — sits past BOUNDARY_RADIUS where
  // the player can never walk, so it never blocks/crowds gameplay.
  const boundaryRingTrees = useMemo(() => {
    const rand = mulberry32(9090);
    const trees: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
      variant: number;
      isForest: boolean;
    }[] = [];
    const count = Math.round(48 * ISLAND_SCALE);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.15;
      const r = BOUNDARY_RADIUS + 2 + rand() * 6;
      trees.push({
        position: [Math.cos(angle) * r, 0, Math.sin(angle) * r],
        rotationY: rand() * Math.PI * 2,
        scale: 0.9 + rand() * 0.6,
        variant: i % 5,
        isForest: rand() < 0.35,
      });
    }
    return trees;
  }, []);

  const puzzlePlacements = useMemo(() => {
    // Evenly spaced along the path, just off to the side so they don't
    // block the walkable stones. Positions come from PUZZLE_POSITIONS
    // (already scaled by ISLAND_SCALE) so puzzles move outward with the
    // rest of the garden instead of staying at the old pre-scale spots.
    return PUZZLE_POSITIONS.map(([x, z], i) => ({
      id: `puzzle-${i + 1}`,
      position: [x, 0, z] as [number, number, number],
    }));
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

  // Clustered wildflower scatter (300-600 instances) across the walkable
  // ground. Rather than uniform rejection-sampling across the whole ground
  // (which reads as an even sprinkle), we pick a handful of cluster
  // centers and scatter flowers in a tight radius around each — natural
  // clumped patches, same as real wildflowers growing where seeds fell.
  const flowerField = useMemo(() => {
    const rand = mulberry32(7070);
    const flowers: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
    }[] = [];

    const half = (GROUND_SIZE - 2) / 2;
    const zOffset = -5 * ISLAND_SCALE;
    // Scaled up linearly with the island (not by area) so the bigger garden
    // still reads as densely flowered without ballooning instance count.
    const targetCount = Math.round(450 * ISLAND_SCALE);
    const clusterCount = Math.round(26 * ISLAND_SCALE);
    const perCluster = Math.ceil(targetCount / clusterCount);
    const clusterRadius = 2.2; // physical patch size stays the same

    let attempts = 0;
    while (flowers.length < targetCount && attempts < clusterCount * 200) {
      attempts++;

      const clusterIndex = Math.floor(flowers.length / perCluster);
      if (clusterIndex >= clusterCount) break;

      // Rejection-sample a cluster center against the exclusion zones.
      let cx = 0;
      let cz = 0;
      let found = false;
      for (let tries = 0; tries < 40; tries++) {
        cx = (rand() - 0.5) * half * 2;
        cz = (rand() - 0.5) * half * 2 + zOffset;
        if (isClearForGroundCover(cx, cz)) {
          found = true;
          break;
        }
      }
      if (!found) continue;

      const angle = rand() * Math.PI * 2;
      const r = rand() * clusterRadius;
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      if (!isClearForGroundCover(x, z)) continue;

      flowers.push({
        position: [x, 0, z],
        rotationY: rand() * Math.PI * 2,
        scale: 0.8 + rand() * 0.6,
      });
    }

    return flowers;
  }, []);

  // A handful of anchor points near flower patches for butterflies to
  // flutter around (Task 4) — derived independently with the same seeded
  // approach rather than reusing flowerField's internal per-flower loop
  // state, so it's a plain, self-contained useMemo.
  const flowerClusterCenters = useMemo<[number, number][]>(() => {
    const rand = mulberry32(3030);
    const half = (GROUND_SIZE - 2) / 2;
    const zOffset = -5 * ISLAND_SCALE;
    const centers: [number, number][] = [];
    let attempts = 0;
    while (centers.length < 6 && attempts < 200) {
      attempts++;
      const cx = (rand() - 0.5) * half * 2;
      const cz = (rand() - 0.5) * half * 2 + zOffset;
      if (isClearForGroundCover(cx, cz)) centers.push([cx, cz]);
    }
    return centers;
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

      {/* Pathway leading to the temple — stone count scales with the path's
          new (longer) length so stepping-stone spacing stays the same. */}
      <Pathway
        waypoints={PATH_WAYPOINTS}
        stoneCount={Math.round(26 * ISLAND_SCALE)}
      />

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

      {/* Clustered wildflower scatter across the walkable ground — see
          FlowerField.tsx. ~6 instanced draw calls total, shadows off. */}
      <FlowerField placements={flowerField} />

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

      {/* Sparse boundary tree line, just past the walkable radius — softens
          the new circular edge visually without affecting gameplay. */}
      {boundaryRingTrees.map((tree, i) =>
        tree.isForest ? (
          <GlbForestTree
            key={`boundary-tree-${i}`}
            position={tree.position}
            rotationY={tree.rotationY}
            scale={tree.scale}
            variant={tree.variant % 4}
          />
        ) : (
          <GlbAutumnTree
            key={`boundary-tree-${i}`}
            position={tree.position}
            rotationY={tree.rotationY}
            scale={tree.scale}
            variant={tree.variant}
          />
        )
      )}

      {/* Glowing rune puzzles along the path */}
      {puzzlePlacements.map(({ id, position }) => (
        <GlowingPuzzle
          key={id}
          id={id}
          position={position}
          isSolved={puzzleSolved.has(id)}
          onActivate={handleActivate}
        />
      ))}

      {/* Horizon backdrop — mountains, floating islands, extra clouds, all
          far outside the walkable ground so it never interacts with
          collision/gameplay. See DistantScenery.tsx. */}
      <DistantScenery />

      {/* Task 1: footstep cadence detection (reads Player's exported world
          position every frame; never touches Player.tsx itself). */}
      <FootstepAudio />

      {/* Task 2: ambient drifting motes across the island. */}
      <AmbientMotes />

      {/* Task 4: butterflies among the flower clusters + circling birds. */}
      <Wildlife flowerCenters={flowerClusterCenters} templePosition={TEMPLE_POSITION} />

      {/* Task 3: finale beam + treasure chest, only once all 4 essences are
          collected. The chest stays visible (and interactable) even after
          being claimed so the player can revisit it; only the "Press E to
          claim" prompt and the one-time onEnigmaComplete overlay trigger
          are gated on finaleClaimed. */}
      <TempleBeam active={allEssencesCollected} position={TEMPLE_POSITION} />
      {allEssencesCollected && (
        <TreasureChest position={CHEST_POSITION} claimed={finaleClaimed} onClaim={claimFinale} />
      )}
    </>
  );
}
