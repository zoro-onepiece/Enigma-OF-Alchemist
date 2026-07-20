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
import GlbButterflies from "./GlbButterfly";
import FootstepAudio from "./FootstepAudio";
import AmbientMotes from "../effects/AmbientMotes";
import GroundLeaves from "./GroundLeaves";
import { useGameStore } from "../../../store/gameStore";
import { ISLAND_SCALE, GROUND_SIZE, BOUNDARY_RADIUS } from "../../../lib/worldCollision";
import { playSfx } from "../../../audio/sounds";
import { MERCHANT_POSITION } from "../../3d/Merchant";

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
// Exported for MinimapOverlay.tsx (Task D) — the temple's world position is
// the map's center reference point, same coordinate space PLAYER_WORLD_POS
// and the puzzle placements below already live in.
export const TEMPLE_POSITION: [number, number, number] = [
  RAW_TEMPLE_POSITION[0] * ISLAND_SCALE,
  0,
  RAW_TEMPLE_POSITION[1] * ISLAND_SCALE,
];

const GROUND_SEGMENTS = 48;

// Task 1/2: single source of truth for the grassy-green ground color, used
// for both the island's ground mesh AND the extended horizon-blending
// ground plane below, so the two can never drift apart / show a seam.
const GROUND_COLOR = "#5c8a4a";

// Task 2: radius of the extra flat ground disc that fills everything
// beyond the island out to (and past) the camera's far clip plane (500,
// see Scene.tsx's <Canvas camera>) so there is never a hard edge or void
// visible past the island boundary — just the same grassy green fading
// into the sky via the existing scene fog. Sits 0.03 below the island
// ground (y=0) to avoid z-fighting where the two overlap.
const EXTENDED_GROUND_RADIUS = 600;
const EXTENDED_GROUND_Y = -0.03;

// Keep scattered props clear of the pathway (a loose corridor around x=0)
// and the temple's footprint — corridor/footprint checks scale with
// ISLAND_SCALE too since the path/temple positions moved outward with it.
// `pathHalfWidthMult` is overridable per-caller (see isClearForGroundCover
// below) — trees keep the original wide 4.5 clearance, but ground cover
// uses a much narrower one; see that call site for why.
function isClearOfPathAndTemple(
  x: number,
  z: number,
  pathHalfWidthMult = 4.5,
) {
  const nearPath =
    Math.abs(x) < pathHalfWidthMult * ISLAND_SCALE &&
    z > -34 * ISLAND_SCALE &&
    z < 5 * ISLAND_SCALE;
  const nearTemple = Math.hypot(x - TEMPLE_POSITION[0], z - TEMPLE_POSITION[2]) < 7;
  return !nearPath && !nearTemple;
}

// Task 3: puzzle pedestal positions, duplicated here (rather than derived
// from puzzlePlacements at call time) so the ground-cover exclusion check
// can be a plain function used inside useMemo generators below.
//
// Previously all 4 pedestals were clustered along the path within ~24
// units of each other, so exploration felt cramped. Now spread one per
// diagonal quadrant (NE/SE/SW/NW) around the island's center rather than
// along the N/S path axis — the straight cardinal directions are avoided
// on purpose since the path corridor runs along x≈0 and the temple sits
// at z≈-99, so a diagonal layout keeps every pedestal well clear of both
// while still reading as "one per quadrant" around the temple. Each raw
// coordinate (21, 21) scales to (57.75, 57.75) — a radius of ~81.7 units
// from center, ~68% of BOUNDARY_RADIUS (120.75), matching the "60-70% of
// the way to the playable boundary" spec. Puzzle ids are assigned by
// array index (`puzzle-${i+1}`), not by which raw position they used, so
// re-ordering/repositioning here never affects which mini-game (Elemental
// Sudoku, etc.) a given pedestal opens.
const RAW_PUZZLE_POSITIONS: [number, number][] = [
  [21, 21], // puzzle-1 — NE quadrant
  [21, -21], // puzzle-2 — SE quadrant
  [-21, -21], // puzzle-3 — SW quadrant
  [-21, 21], // puzzle-4 — NW quadrant
];
const PUZZLE_POSITIONS: [number, number][] = RAW_PUZZLE_POSITIONS.map(
  ([x, z]) => [x * ISLAND_SCALE, z * ISLAND_SCALE]
);
const PUZZLE_CLEAR_RADIUS = 1.8;

// Exported for MinimapOverlay.tsx (Task D) — the exact id/position pairs
// already used to place the GlowingPuzzle pedestals below, so the minimap
// dots can never drift out of sync with where the pedestals actually are.
// A plain module constant (not a useMemo) since it never depended on any
// props/state to begin with — it was already effectively static.
export const PUZZLE_PLACEMENTS: { id: string; position: [number, number, number] }[] =
  PUZZLE_POSITIONS.map(([x, z], i) => ({
    id: `puzzle-${i + 1}`,
    position: [x, 0, z] as [number, number, number],
  }));

// Extra exclusion for dense ground cover (grass/flowers only) — on top of
// the path/temple clearing, also keep a small clear radius around each
// puzzle pedestal so tufts/flowers don't clip through them.
//
// Uses a narrower path corridor (2.0x vs trees' 4.5x = 5.5 vs 12.4 world
// units each side) than isClearOfPathAndTemple's default. The 4.5
// clearance trees use was sized to keep their trunks well clear of the
// walkway; reusing that same number for ground cover meant clearing ~25
// world units of width around the ENTIRE path — including the player's own
// spawn point at (0,0) — versus the stepping-stone path itself
// (Pathway.tsx) being only ~1.1 units wide. That's why the jittered-grid
// grass fix still read as "not appearing": it WAS generating and rendering
// correctly, just never within view near spawn or along the path, which is
// exactly where a player looks first. 2.0 keeps a comfortable margin
// around the path's actual wander + stone radius instead.
const GROUND_COVER_PATH_HALF_WIDTH_MULT = 2.0;
// Merchant footprint is much bigger than a puzzle pedestal (scale=15 —
// see Merchant.tsx), so grass needs a wider clearance than
// PUZZLE_CLEAR_RADIUS to avoid poking through his model/stall.
const MERCHANT_CLEAR_RADIUS = 6;

function isClearForGroundCover(x: number, z: number) {
  if (!isClearOfPathAndTemple(x, z, GROUND_COVER_PATH_HALF_WIDTH_MULT)) return false;
  for (const [px, pz] of PUZZLE_POSITIONS) {
    if (Math.hypot(x - px, z - pz) < PUZZLE_CLEAR_RADIUS) return false;
  }
  if (
    Math.hypot(x - MERCHANT_POSITION[0], z - MERCHANT_POSITION[2]) <
    MERCHANT_CLEAR_RADIUS
  ) {
    return false;
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

export interface GameEnvironmentProps {
  // Emergency GPU-stability pass: staggered mount waterfall (see Scene.tsx,
  // which owns the actual setTimeout/state-flag timing) — spreads the
  // texture-upload spike after "Begin" across ~1s instead of every GLB in
  // the world uploading simultaneously, which was implicated in a
  // confirmed WebGL context loss. Ground/pathway/temple/puzzles are
  // procedural (no GLB) and always render regardless of these flags —
  // only the GLB-heavy decorative layers are gated.
  mountTrees?: boolean;
  mountDecor?: boolean;
}

export default function GameEnvironment({
  mountTrees = true,
  mountDecor = true,
}: GameEnvironmentProps) {
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

  // Evenly spaced along the path, just off to the side so they don't block
  // the walkable stones — see the exported PUZZLE_PLACEMENTS constant above.
  const puzzlePlacements = PUZZLE_PLACEMENTS;

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
    // Task 4: sink every pot -0.02 below y=0 so the base is embedded in
    // the ground with no gap, and the 0.75-1.15 scale jitter (was
    // 0.8-1.4) keeps every instance within the ~0.3-0.5 unit spec range
    // after GlbFlowerPot's own TARGET_HEIGHT=0.42 base scale.
    for (const [wx, wz] of PATH_WAYPOINTS) {
      for (const side of [-1, 1]) {
        if (rand() < 0.35) continue; // skip some for a natural, uneven line
        const offsetX = side * (2.8 + rand() * 1.6);
        pots.push({
          position: [wx + offsetX, -0.02, wz + (rand() - 0.5) * 3],
          rotationY: rand() * Math.PI * 2,
          scale: 0.75 + rand() * 0.4,
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
          -0.02,
          TEMPLE_POSITION[2] + Math.sin(angle) * r,
        ],
        rotationY: rand() * Math.PI * 2,
        scale: 0.75 + rand() * 0.4,
      });
    }

    return pots;
  }, []);

  // Performance pass: the grass system (191,912-instance single
  // InstancedMesh, frustumCulled={false}, patch_of_grass.glb) removed
  // entirely — re-confirmed still mounted here (import + <GrassField/>
  // render call) despite this being a previously-decided removal, so
  // removing it again along with GrassField.tsx and patch_of_grass.glb.
  // The ground mesh's own material carries the "grass" look; there are no
  // individual 3D blades anymore.

  // Anemone flower beds — restored as their own decorative layer alongside
  // (not replacing) the grass above. A prior session mistakenly treated
  // FlowerField as "the grass system" and removed it when GrassField was
  // added; flowers and grass are actually two separate, complementary
  // ground-cover layers. Same jittered-grid approach as grass, just a
  // coarser cell (2.2) and one flower-bed placement per cell, matching
  // this layer's original density.
  const flowerField = useMemo(() => {
    const rand = mulberry32(7070);
    const flowers: {
      position: [number, number, number];
      rotationY: number;
      scale: number;
    }[] = [];

    const half = (GROUND_SIZE - 2) / 2;
    const zOffset = -5 * ISLAND_SCALE;
    const GRID_CELL_SIZE = 2.2;
    const GRID_JITTER = 0.85;

    const minX = -half;
    const maxX = half;
    const minZ = zOffset - half;
    const maxZ = zOffset + half;
    const cols = Math.ceil((maxX - minX) / GRID_CELL_SIZE);
    const rows = Math.ceil((maxZ - minZ) / GRID_CELL_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellCenterX = minX + (col + 0.5) * GRID_CELL_SIZE;
        const cellCenterZ = minZ + (row + 0.5) * GRID_CELL_SIZE;
        const x =
          cellCenterX + (rand() - 0.5) * GRID_CELL_SIZE * GRID_JITTER;
        const z =
          cellCenterZ + (rand() - 0.5) * GRID_CELL_SIZE * GRID_JITTER;

        if (!isClearForGroundCover(x, z)) continue;

        flowers.push({
          position: [x, 0, z],
          rotationY: rand() * Math.PI * 2,
          scale: 0.8 + rand() * 0.6,
        });
      }
    }

    return flowers;
  }, []);

  // Scattered ground-leaf litter — a separate decorative layer from both
  // grass and flowers above (and unrelated to SprintLeaves.tsx, the
  // character's own sprint fx). Same jittered-grid + exclusion-zone
  // approach as grass/flowers, targeting ~100,000 instances total; see
  // GroundLeaves.tsx for the GPU-instancing + proximity-reaction approach.
  const groundLeaves = useMemo(() => {
    const rand = mulberry32(9911);
    const leaves: {
      position: [number, number, number];
      rotationY: number;
      tiltX: number;
      tiltZ: number;
      scale: number;
      shapeIndex: number;
    }[] = [];

    const half = (GROUND_SIZE - 2) / 2;
    const zOffset = -5 * ISLAND_SCALE;
    // Emergency GPU-stability pass: raised 1.1 -> 2.18 (confirmed via a
    // standalone script replicating this exact generator + exclusion-zone
    // logic against real numbers, not estimated) to cut the instance count
    // from 97,910 to 24,899 — closest clean match to the ~25,000 target,
    // following a confirmed WebGL context-loss crash. Same single-constant
    // lever as before (LEAVES_PER_CELL left alone), still 32 draw calls
    // via GroundLeaves.tsx's 4x4 chunking, just far fewer instances/chunk.
    const GRID_CELL_SIZE = 2.18;
    const GRID_JITTER = 0.9;
    const LEAVES_PER_CELL = 2;

    const minX = -half;
    const maxX = half;
    const minZ = zOffset - half;
    const maxZ = zOffset + half;
    const cols = Math.ceil((maxX - minX) / GRID_CELL_SIZE);
    const rows = Math.ceil((maxZ - minZ) / GRID_CELL_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellCenterX = minX + (col + 0.5) * GRID_CELL_SIZE;
        const cellCenterZ = minZ + (row + 0.5) * GRID_CELL_SIZE;

        for (let l = 0; l < LEAVES_PER_CELL; l++) {
          const x = cellCenterX + (rand() - 0.5) * GRID_CELL_SIZE * GRID_JITTER;
          const z = cellCenterZ + (rand() - 0.5) * GRID_CELL_SIZE * GRID_JITTER;

          if (!isClearForGroundCover(x, z)) continue;

          leaves.push({
            position: [x, 0, z],
            rotationY: rand() * Math.PI * 2,
            tiltX: (rand() - 0.5) * 0.3,
            tiltZ: (rand() - 0.5) * 0.3,
            scale: 0.7 + rand() * 0.6,
            shapeIndex: leaves.length % 2,
          });
        }
      }
    }

    return leaves;
  }, []);

  // A handful of anchor points near flower patches for butterflies to
  // flutter around (Task 4) — derived independently with the same seeded
  // approach rather than reusing grassField's internal per-blade loop
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

      {/* Task 1: island ground — flat, hard, grassy green (was sandy-yellow
          #e2c17c). GROUND_COLOR is shared with the Task 2 extended ground
          plane below so the two can never mismatch. */}
      <mesh
        geometry={groundGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color={GROUND_COLOR} roughness={0.95} />
      </mesh>

      {/* Task 2: extended ground plane — same exact color/material as the
          island ground, sitting 0.03 below it, reaching out to (and past)
          the camera's far clip distance. Fills what used to be a hard
          edge/void just past the island boundary with a seamless
          continuation of the same grassy green, which the existing scene
          fog (Scene.tsx) then fades into the sky at distance. No collision
          implications — purely visual, sits well outside BOUNDARY_RADIUS
          where the player can already never walk. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, EXTENDED_GROUND_Y, 0]}
        receiveShadow={false}
        castShadow={false}
      >
        <circleGeometry args={[EXTENDED_GROUND_RADIUS, 64]} />
        <meshStandardMaterial color={GROUND_COLOR} roughness={0.95} />
      </mesh>

      {/* Pathway leading to the temple — stone count scales with the path's
          new (longer) length so stepping-stone spacing stays the same. */}
      <Pathway
        waypoints={PATH_WAYPOINTS}
        stoneCount={Math.round(26 * ISLAND_SCALE)}
      />

      {/* Temple at the far end of the path — Task C: gold glow + walk-in
          finale trigger once all 4 essences are collected, additive
          alongside the treasure chest's own claim trigger below (both
          call the same gameStore.claimFinale action). */}
      <JapaneseTemple
        position={TEMPLE_POSITION}
        glowActive={allEssencesCollected}
        finaleClaimed={finaleClaimed}
        onEnterInterior={claimFinale}
      />

      {mountDecor && (
        <>
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

          {/* Anemone flower beds — ground-cover decorative layer. See
              FlowerField.tsx. (Grass system removed — see the removal note
              above this component's flowerField declaration.) */}
          <FlowerField placements={flowerField} />

          {/* Scattered ground-leaf litter — separate system from
              SprintLeaves (character sprint fx, untouched). See
              GroundLeaves.tsx. */}
          <GroundLeaves placements={groundLeaves} />
        </>
      )}

      {mountTrees && (
        <>
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

          {/* Sparse boundary tree line, just past the walkable radius —
              softens the new circular edge visually without affecting
              gameplay. */}
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
        </>
      )}

      {/* Glowing rune puzzles along the path — gameplay-critical, always
          mounts immediately (not part of the decor/tree stagger). */}
      {puzzlePlacements.map(({ id, position }) => (
        <GlowingPuzzle
          key={id}
          id={id}
          position={position}
          isSolved={puzzleSolved.has(id)}
          onActivate={handleActivate}
        />
      ))}

      {mountDecor && (
        /* Horizon backdrop — mountains, floating islands, extra clouds, all
           far outside the walkable ground so it never interacts with
           collision/gameplay. See DistantScenery.tsx. GLB-based (uses
           forest_tree_pack.glb), so part of the decor stage. */
        <DistantScenery />
      )}

      {/* Task 1: footstep cadence detection (reads Player's exported world
          position every frame; never touches Player.tsx itself). */}
      <FootstepAudio />

      {/* Task 2: ambient drifting motes across the island. */}
      <AmbientMotes />

      {/* Task 4: circling birds (procedural). Butterflies are now the real
          GLB model below instead of Wildlife's old procedural planes. */}
      <Wildlife flowerCenters={flowerClusterCenters} templePosition={TEMPLE_POSITION} />

      {mountDecor && (
        /* GLB butterflies scattered across the flower clusters, replacing
           the old procedural plane-wing butterflies. */
        <GlbButterflies flowerCenters={flowerClusterCenters} count={15} />
      )}

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
