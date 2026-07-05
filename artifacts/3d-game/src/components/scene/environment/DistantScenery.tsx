import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Clouds, Cloud, useGLTF } from "@react-three/drei";
import {
  FOREST_TREE_MODEL_PATH,
  FOREST_TREE_AXIS_FIX_ROTATION,
  FOREST_TREE_TARGET_BASE_HEIGHT,
  FOREST_TRUNK_NODES,
  FOREST_BRANCH_NODES,
  FOREST_VARIANT_BOUNDS,
} from "./GlbForestTree";
import { ISLAND_SCALE } from "../../../lib/worldCollision";

/**
 * DistantScenery
 *
 * Fills the horizon so it never reads as "empty sky meeting bare ground"
 * from anywhere on the playable island: a ring of low-poly mountains, a
 * handful of slowly-bobbing floating islands, and extra soft clouds hugging
 * the skyline. Everything here sits far outside the walkable ~90-unit
 * ground plane (radius 120-250) and casts no shadows — purely a backdrop,
 * never a collidable or interactive object, so it never touches
 * worldCollision/Player.tsx.
 */

// Seeded PRNG (mulberry32) — same approach as GameEnvironment.tsx, kept
// local to this file so distant-scenery layout doesn't depend on (or
// reshuffle alongside) the near-ground scatter seeds.
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

// Two depth rings for atmospheric perspective: the nearer ring reads as
// solid, saturated blue-grey rock; the farther ring is lighter/cooler so it
// visually recedes into the sky haze (fog does the rest of the hazing).
const NEAR_MOUNTAIN_COLORS = ["#75899e", "#66798f", "#8395a8"];
const FAR_MOUNTAIN_COLORS = ["#a8b8c8", "#b3c1cf", "#9fb2c4"];

interface MountainSpec {
  position: [number, number, number];
  baseRadius: number;
  height: number;
  segments: number;
  color: string;
  rotationY: number;
}

// Each "mountain" on the horizon is a cluster of 3-5 jittered cones of
// varying height/radius/rotation around a shared center, rather than one
// clean cone — reads as a rugged, irregular peak instead of a toy shape.
function buildMountainCluster(
  rand: () => number,
  center: [number, number],
  clusterHeight: number,
  colors: string[]
): MountainSpec[] {
  const cones: MountainSpec[] = [];
  const coneCount = 3 + Math.floor(rand() * 3); // 3-5
  const jitterRadius = clusterHeight * 0.35;
  for (let i = 0; i < coneCount; i++) {
    const offAngle = rand() * Math.PI * 2;
    const offDist = rand() * jitterRadius;
    const x = center[0] + Math.cos(offAngle) * offDist;
    const z = center[1] + Math.sin(offAngle) * offDist;
    const height = clusterHeight * (0.55 + rand() * 0.55);
    cones.push({
      position: [x, height / 2, z],
      baseRadius: height * (0.5 + rand() * 0.35),
      height,
      segments: 4 + Math.floor(rand() * 3), // 4-6, low-poly facets
      color: colors[Math.floor(rand() * colors.length)],
      rotationY: rand() * Math.PI * 2,
    });
  }
  return cones;
}

function useMountainRing(): MountainSpec[] {
  return useMemo(() => {
    const rand = mulberry32(9001);
    const specs: MountainSpec[] = [];

    const ringDefs = [
      // Near ring — closer, darker, taller-reading clusters.
      {
        count: 7,
        radiusMin: 140 * ISLAND_SCALE,
        radiusMax: 190 * ISLAND_SCALE,
        heightMin: 24,
        heightMax: 55,
        colors: NEAR_MOUNTAIN_COLORS,
      },
      // Far ring — farther out, lighter/hazier, taller peaks poking above
      // the near ring's silhouette for depth.
      {
        count: 7,
        radiusMin: 205 * ISLAND_SCALE,
        radiusMax: 270 * ISLAND_SCALE,
        heightMin: 35,
        heightMax: 75,
        colors: FAR_MOUNTAIN_COLORS,
      },
    ];

    for (const ring of ringDefs) {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2 + (rand() - 0.5) * 0.45;
        const radius = ring.radiusMin + rand() * (ring.radiusMax - ring.radiusMin);
        const x = Math.sin(angle) * radius;
        // Shift ring center slightly toward -Z since the garden/path
        // extends that way toward the temple, so the ring still frames the
        // whole walkable area evenly rather than being centered only on
        // spawn.
        const z = Math.cos(angle) * radius - 15 * ISLAND_SCALE;
        const clusterHeight = ring.heightMin + rand() * (ring.heightMax - ring.heightMin);
        specs.push(...buildMountainCluster(rand, [x, z], clusterHeight, ring.colors));
      }
    }
    return specs;
  }, []);
}

function Mountains() {
  const mountains = useMountainRing();
  return (
    <>
      {mountains.map((m, i) => (
        <mesh
          key={`mountain-${i}`}
          position={m.position}
          rotation={[0, m.rotationY, 0]}
          castShadow={false}
          receiveShadow={false}
        >
          <coneGeometry args={[m.baseRadius, m.height, m.segments]} />
          <meshStandardMaterial color={m.color} roughness={1} flatShading fog />
        </mesh>
      ))}
    </>
  );
}

interface IslandSpec {
  position: [number, number, number];
  scale: number;
  bobSpeed: number;
  bobAmplitude: number;
  rockColor: string;
  grassColor: string;
  phase: number;
}

function useFloatingIslands(): IslandSpec[] {
  return useMemo(() => {
    const rand = mulberry32(4242);
    const count = 3;
    const specs: IslandSpec[] = [];
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = (150 + rand() * 70) * ISLAND_SCALE; // 150 - 220, scaled
      const height = 42 + rand() * 28; // 42 - 70 (vertical, not scaled)
      specs.push({
        position: [
          Math.sin(angle) * radius,
          height,
          Math.cos(angle) * radius - 15 * ISLAND_SCALE,
        ],
        scale: 1.6 + rand() * 1.4,
        bobSpeed: 0.15 + rand() * 0.15,
        bobAmplitude: 0.6 + rand() * 0.6,
        rockColor: i % 2 === 0 ? "#6b5c4d" : "#5c6b52",
        grassColor: "#8fae5c",
        phase: rand() * Math.PI * 2,
      });
    }
    return specs;
  }, []);
}

// Purely decorative copy of forest_tree_pack.glb's tree meshes — no
// collision registration, since these sit high in the sky on floating
// islands far outside the walkable ground.
function DecorTree({
  position,
  scale,
  variant,
}: {
  position: [number, number, number];
  scale: number;
  variant: number;
}) {
  const { nodes } = useGLTF(FOREST_TREE_MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };
  const idx = variant % FOREST_TRUNK_NODES.length;
  const trunkNode = nodes[FOREST_TRUNK_NODES[idx]];
  const branchNode = nodes[FOREST_BRANCH_NODES[idx]];
  const bounds = FOREST_VARIANT_BOUNDS[idx];
  const finalScale = (FOREST_TREE_TARGET_BASE_HEIGHT / bounds.height) * scale;

  if (!trunkNode) return null;

  return (
    <group position={position} scale={finalScale}>
      <group rotation={FOREST_TREE_AXIS_FIX_ROTATION} position={[0, bounds.baseOffset, 0]}>
        <mesh geometry={trunkNode.geometry} material={trunkNode.material} castShadow={false} receiveShadow={false} />
        {branchNode && (
          <mesh geometry={branchNode.geometry} material={branchNode.material} castShadow={false} receiveShadow={false} />
        )}
      </group>
    </group>
  );
}

function FloatingIsland({ spec }: { spec: IslandSpec }) {
  const group = useRef<THREE.Group>(null);
  const baseY = spec.position[1];

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = baseY + Math.sin(clock.elapsedTime * spec.bobSpeed + spec.phase) * spec.bobAmplitude;
  });

  return (
    <group ref={group} position={spec.position} scale={spec.scale}>
      {/* Rocky underside — inverted low-poly cone */}
      <mesh position={[0, -1.1, 0]} rotation={[Math.PI, 0, 0]} castShadow={false} receiveShadow={false}>
        <coneGeometry args={[3, 2.6, 6]} />
        <meshStandardMaterial color={spec.rockColor} roughness={1} flatShading />
      </mesh>
      {/* Flat grassy top */}
      <mesh position={[0, 0.1, 0]} castShadow={false} receiveShadow={false}>
        <cylinderGeometry args={[3, 3, 0.35, 6]} />
        <meshStandardMaterial color={spec.grassColor} roughness={1} flatShading />
      </mesh>
      {/* Small tree cluster on top */}
      <DecorTree position={[0.7, 0.3, 0.5]} scale={0.55} variant={0} />
      <DecorTree position={[-0.9, 0.3, -0.4]} scale={0.4} variant={2} />
    </group>
  );
}

function FloatingIslands() {
  const islands = useFloatingIslands();
  return (
    <>
      {islands.map((spec, i) => (
        <FloatingIsland key={`island-${i}`} spec={spec} />
      ))}
    </>
  );
}

export default function DistantScenery() {
  return (
    <>
      <Mountains />
      <FloatingIslands />

      {/* Extra large, soft clouds hugging the horizon (lower + farther out
          than Scene.tsx's main cloud layer) so there's always something in
          view between the mountain ring and the sky at any camera angle. */}
      <Clouds material={THREE.MeshBasicMaterial} limit={20} range={80}>
        <Cloud
          seed={101}
          position={[-160 * ISLAND_SCALE, 38, -60 * ISLAND_SCALE]}
          bounds={[70, 12, 70]}
          volume={40}
          opacity={0.45}
          speed={0.03}
        />
        <Cloud
          seed={202}
          position={[150 * ISLAND_SCALE, 46, 40 * ISLAND_SCALE]}
          bounds={[75, 14, 75]}
          volume={44}
          opacity={0.4}
          speed={0.025}
        />
        <Cloud
          seed={303}
          position={[20 * ISLAND_SCALE, 42, -190 * ISLAND_SCALE]}
          bounds={[80, 13, 80]}
          volume={42}
          opacity={0.42}
          speed={0.03}
        />
      </Clouds>
    </>
  );
}
