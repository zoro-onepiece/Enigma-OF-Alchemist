import { useMemo } from "react";
import * as THREE from "three";
import CherryBlossomTree from "./CherryBlossomTree";
import QuantumTree from "./QuantumTree";
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

  // Gently randomized low-poly ground — subtle per-vertex height noise only,
  // so it doesn't fight the player's fixed y=0 ground clamp.
  const groundGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(
      GROUND_SIZE,
      GROUND_SIZE,
      GROUND_SEGMENTS,
      GROUND_SEGMENTS
    );
    const rand = mulberry32(4242);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i); // pre-rotation "Y" is world Z once rotated flat
      // Keep the area right around the path/temple flat so stepping stones
      // and the temple platform don't appear to float or sink.
      const clear = isClearOfPathAndTemple(x, y);
      const noise = clear ? (rand() - 0.5) * 0.35 : 0;
      position.setZ(i, noise);
    }
    geometry.computeVertexNormals();
    return geometry;
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

      {/* Ground — mossy green, gentle low-poly undulation */}
      <mesh
        geometry={groundGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#3f5d3f" roughness={0.95} />
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
