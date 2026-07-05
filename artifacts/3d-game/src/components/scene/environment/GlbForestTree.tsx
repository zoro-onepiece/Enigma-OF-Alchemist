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

// The source pack was authored Z-up (its "tree height" axis is local Z, not
// Y — confirmed by inspecting each mesh's accessor bounds: the trunk/branch
// pairs are ~1-2 units wide/deep on X/Y but 10-23 units long on Z). Left
// unrotated, that read as "trees hovering/oversized" — the whole tree lies
// on its side and gets scaled as if that huge Z-length were normal.
// Rotating -90° about X converts Z-up into the Y-up frame everything else
// in this scene uses (z -> y, y -> -z).
const AXIS_FIX_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

// Per-variant (trunk+branches combined) bounding info measured directly
// from the GLB's accessor min/max in *local, pre-rotation* Z (the "up" axis
// before AXIS_FIX_ROTATION is applied): [combinedHeight, -zMin].
// -zMin is how far the lowest point sits below the mesh origin — after the
// axis-fix rotation that becomes how far below y=0 the trunk base is, so
// translating up by that amount (pre outer-scale) plants the trunk base
// exactly on the ground for every variant regardless of its native size.
const VARIANT_BOUNDS: { height: number; baseOffset: number }[] = [
  { height: 20.4508, baseOffset: 7.9675 }, // variant 0 (Tree_..._01)
  { height: 23.0844, baseOffset: 7.7003 }, // variant 1 (Tree_..._01.001)
  { height: 19.0446, baseOffset: 7.7282 }, // variant 2 (Tree_..._01.002)
  { height: 10.2039, baseOffset: 4.3410 }, // variant 3 (Tree_..._02)
];

// Target height (in world units) for an instance at scale=1, chosen so the
// full 1.1–1.8 instance scale range in GameEnvironment.tsx lands at ~3–5x
// the character's on-screen height (rawHeight * PLAYER_SCALE ≈ 1.58 * 0.4
// ≈ 0.63): 1.74 * 1.1 ≈ 3.0x, 1.74 * 1.8 ≈ 5.0x.
const TARGET_BASE_HEIGHT = 1.74;

export interface GlbForestTreeProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  variant?: number;
}

// Rough trunk footprint radius (in local, pre-scale units) used for the
// solid collision blocker — intentionally small/conservative, good enough
// to stop the player at the trunk without needing exact geometry bounds.
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

  const variantIndex = variant % TRUNK_NODES.length;
  const trunkNode = nodes[TRUNK_NODES[variantIndex]];
  const branchNode = nodes[BRANCH_NODES[variantIndex]];
  const bounds = VARIANT_BOUNDS[variantIndex];

  // Normalize this variant's native height to TARGET_BASE_HEIGHT before
  // applying the caller's instance `scale`, so every variant reads at a
  // consistent, character-relative size instead of inheriting the pack's
  // wildly different native mesh sizes (10–23 local units tall).
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

  const trunkGeometry = useMemo(() => trunkNode?.geometry, [trunkNode]);
  const branchGeometry = useMemo(() => branchNode?.geometry, [branchNode]);

  if (!trunkGeometry) return null;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={finalScale}>
      {/* Axis-fix + ground-plant: rotate the pack's Z-up geometry into Y-up,
          then shift up by this variant's baseOffset so the trunk base sits
          exactly at local y=0 (i.e. world y = position.y). */}
      <group rotation={AXIS_FIX_ROTATION} position={[0, bounds.baseOffset, 0]}>
        <mesh geometry={trunkGeometry} material={trunkNode.material} castShadow receiveShadow />
        {branchGeometry && (
          <mesh geometry={branchGeometry} material={branchNode.material} castShadow receiveShadow />
        )}
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
