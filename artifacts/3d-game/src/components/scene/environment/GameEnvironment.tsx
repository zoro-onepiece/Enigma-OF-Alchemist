import { useMemo } from "react";
import * as THREE from "three";
import CherryBlossomTree from "./CherryBlossomTree";
import QuantumTree from "./QuantumTree";
import GreenLeafTree from "./GreenLeafTree";
import GlbForestTree from "./GlbForestTree";
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

  const cherryBlossomTrees = useMemo(() => {
    const rand = mulberry32(1010);
    const trees: { position: [number, number, number]; scale: number }[] = [];
    let attempts = 0;
    while (trees.length < 16 && attempts < 500) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 10);
      const z = (rand() - 0.5) * (GROUND_SIZE - 10) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      trees.push({ position: [x, 0, z], scale: 0.9 + rand() * 0.5 });
    }
    return trees;
  }, []);

  const quantumTrees = useMemo(() => {
    const rand = mulberry32(2020);
    const trees: { position: [number, number, number] }[] = [];
    let attempts = 0;
    while (trees.length < 5 && attempts < 500) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 16);
      const z = (rand() - 0.5) * (GROUND_SIZE - 16) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      trees.push({ position: [x, 0, z] });
    }
    return trees;
  }, []);

  const greenLeafTrees = useMemo(() => {
    const rand = mulberry32(3030);
    const trees: { position: [number, number, number]; scale: number }[] = [];
    let attempts = 0;
    while (trees.length < 12 && attempts < 500) {
      attempts++;
      const x = (rand() - 0.5) * (GROUND_SIZE - 10);
      const z = (rand() - 0.5) * (GROUND_SIZE - 10) - 5;
      if (!isClearOfPathAndTemple(x, z)) continue;
      trees.push({ position: [x, 0, z], scale: 0.85 + rand() * 0.4 });
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

  return (
    <>
      {/* Dusky purple-blue fog for atmosphere */}
      <fog attach="fog" args={["#2a1f3d", 15, 85]} />

      {/* Slightly stronger ambient fill on top of Scene.tsx's lighting rig,
          so the temple garden reads clearly at dusk. */}
      <ambientLight intensity={0.25} color="#c9b6ff" />

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

      {/* Cherry blossom grove */}
      {cherryBlossomTrees.map((tree, i) => (
        <CherryBlossomTree key={`cherry-${i}`} position={tree.position} scale={tree.scale} />
      ))}

      {/* Quantum trees */}
      {quantumTrees.map((tree, i) => (
        <QuantumTree key={`quantum-${i}`} position={tree.position} />
      ))}

      {/* Adorable green-leaf trees */}
      {greenLeafTrees.map((tree, i) => (
        <GreenLeafTree key={`green-${i}`} position={tree.position} scale={tree.scale} />
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
    </>
  );
}
