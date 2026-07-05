import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { registerBlocker } from "../../../lib/worldCollision";

/**
 * GlbAutumnTree
 *
 * Renders individual tree species pulled out of the user-provided
 * "low_poly_trees_flowers_and_grass.glb" pack (also a Sketchfab-style prop
 * pack, every species a standalone bark+branches mesh pair at the origin —
 * same shape as GlbForestTree's forest_tree_pack.glb, just a different
 * asset with more color variety: green/dry/autumn-yellow/autumn-brown).
 *
 * This replaces the fully procedural CherryBlossomTree / QuantumTree /
 * GreenLeafTree components in GameEnvironment.tsx with real artist-made
 * geometry so the garden's trees read as consistent, intentional low-poly
 * art instead of a mix of hand-rolled primitive shapes.
 */
const MODEL_PATH = "/models/autumn_tree_pack.glb";

// Bark(trunk) + branches(canopy) mesh node pairs as authored in the GLB.
const BARK_NODES = [
  "tree-stylized-01_tree-wood_0",
  "tree-stylized-02-dry_tree-bark-02_0",
  "tree-stylized-03-autumn-yellow_tree-bark-03_0",
  "tree-stylized-04-green_tree-04_0",
  "tree-stylized-05-autumn-brown_tree-bark-03_0",
];
const BRANCH_NODES = [
  "tree-stylized-01_tree-branch-stylized-diffuse_0",
  "tree-stylized-02-dry_tree-branches-dry-diffuse_0",
  "tree-stylized-03-autumn-yellow_tree-branches-autumn-yellow-mix-diffuse_0",
  "tree-stylized-04-green_tree-branches-mix-diffuse_0",
  "tree-stylized-05-autumn-brown_tree-branches-autumn-mix-diffuse_0",
];

// Like forest_tree_pack.glb, this pack is authored Z-up (confirmed via the
// GLB's accessor min/max — bark meshes sit at local Z≈0 rising to Z≈5.6-6.5,
// canopy meshes float above that). Same -90°-about-X axis fix applies.
const AXIS_FIX_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

// Per-variant (bark+branches combined) bounds measured directly from the
// GLB's accessor min/max in local, pre-rotation Z: [combinedHeight, -zMin].
const VARIANT_BOUNDS: { height: number; baseOffset: number }[] = [
  { height: 7.91, baseOffset: 0.0 }, // variant 0 (stylized-01)
  { height: 8.69, baseOffset: 0.14 }, // variant 1 (02-dry)
  { height: 7.47, baseOffset: 0.14 }, // variant 2 (03-autumn-yellow)
  { height: 8.27, baseOffset: 0.0 }, // variant 3 (04-green)
  { height: 8.11, baseOffset: 0.52 }, // variant 4 (05-autumn-brown)
];

// Same character-relative target height convention as GlbForestTree, so
// both packs read at a consistent scale when scattered together.
const TARGET_BASE_HEIGHT = 1.74;

const TRUNK_RADIUS = 0.35;

export interface GlbAutumnTreeProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  variant?: number;
}

export default function GlbAutumnTree({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  variant = 0,
}: GlbAutumnTreeProps) {
  const { nodes } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const variantIndex = variant % BARK_NODES.length;
  const barkNode = nodes[BARK_NODES[variantIndex]];
  const branchNode = nodes[BRANCH_NODES[variantIndex]];
  const bounds = VARIANT_BOUNDS[variantIndex];

  const finalScale = (TARGET_BASE_HEIGHT / bounds.height) * scale;

  const [px, , pz] = position;
  const radius = TRUNK_RADIUS * finalScale;

  useEffect(() => {
    return registerBlocker({
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      isSolid: () => true,
    });
  }, [px, pz, radius]);

  const barkGeometry = useMemo(() => barkNode?.geometry, [barkNode]);
  const branchGeometry = useMemo(() => branchNode?.geometry, [branchNode]);

  if (!barkGeometry) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={finalScale}>
      <group rotation={AXIS_FIX_ROTATION} position={[0, bounds.baseOffset, 0]}>
        <mesh geometry={barkGeometry} material={barkNode.material} castShadow receiveShadow />
        {branchGeometry && (
          <mesh geometry={branchGeometry} material={branchNode.material} castShadow receiveShadow />
        )}
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
