import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { registerBlocker } from "../../../lib/worldCollision";

/**
 * GlbForestTree
 *
 * Renders copies of individual tree meshes pulled out of the user-provided
 * "low_poly_forest_tree_pack.glb" (a Sketchfab prop pack — every tree/rock
 * variant in it is a standalone mesh sitting at the origin, not a pre-laid-out
 * scene), instead of loading the whole pack's scene graph per instance.
 *
 * Each instance picks a trunk + matching branches pair by `variant` so
 * scattered copies read as a proper forest with some visual variety, and
 * registers itself as a solid collision blocker (small square footprint
 * around the trunk) so the player can't walk through the trunk.
 */
const MODEL_PATH = "/models/forest_tree_pack.glb";

// Trunk/branch mesh node names as authored in the GLB (see console/gltf
// inspection during setup) — every "Tree_Trunk_XX"/"Tree_Branches_XX" node
// is an independent standalone mesh at the origin, safe to pair up.
const TRUNK_NODES = [
  "Tree_Trunk_01_Tree_Trunk_01_0",
  "Tree_Trunk_01.001_Tree_Trunk_01_0",
  "Tree_Trunk_01.002_Tree_Trunk_01_0",
  "Tree_Trunk_02_Tree_Trunk_02_0",
];
const BRANCH_NODES = [
  "Tree_Branches_01_Tree_Branches_01_0",
  "Tree_Branches_01.001_Tree_Branches_01_0",
  "Tree_Branches_01.002_Tree_Branches_01_0",
  "Tree_Branches_02_Tree_Branches_02_0",
];

export interface GlbForestTreeProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  variant?: number;
}

// Rough trunk footprint radius (in local, pre-scale units) used both for the
// solid collision blocker and is intentionally small/conservative — good
// enough to stop the player at the trunk without needing exact geometry
// bounds.
const TRUNK_RADIUS = 0.4;

export default function GlbForestTree({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  variant = 0,
}: GlbForestTreeProps) {
  const { nodes } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const trunkNode = nodes[TRUNK_NODES[variant % TRUNK_NODES.length]];
  const branchNode = nodes[BRANCH_NODES[variant % BRANCH_NODES.length]];

  const [px, , pz] = position;
  const radius = TRUNK_RADIUS * scale;

  useEffect(() => {
    return registerBlocker({
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      isSolid: () => true,
    });
  }, [px, pz, radius]);

  const trunkGeometry = useMemo(() => trunkNode?.geometry, [trunkNode]);
  const branchGeometry = useMemo(() => branchNode?.geometry, [branchNode]);

  if (!trunkGeometry) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <mesh geometry={trunkGeometry} material={trunkNode.material} castShadow receiveShadow />
      {branchGeometry && (
        <mesh geometry={branchGeometry} material={branchNode.material} castShadow receiveShadow />
      )}
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
