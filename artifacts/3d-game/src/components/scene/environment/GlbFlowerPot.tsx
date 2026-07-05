import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * GlbFlowerPot
 *
 * Small potted-flower ground-cover prop pulled from the user-provided
 * "low_poly_flowers.glb" pack. Unlike the tree packs, this is a single
 * decorative object (a small pot/vase + leaf + flower-bloom parts, all
 * authored Y-up and sharing one local origin) rather than a set of
 * interchangeable species, so there's no per-variant table here — every
 * instance renders the same 7 mesh/material parts, just scattered with
 * different position/rotation/scale like real garden accents would be.
 *
 * Purely decorative: no collision registration (matches how small ground
 * clutter behaves in this game — only trees/temple/props block movement).
 */
const MODEL_PATH = "/models/flower_pack.glb";

// Every mesh part in the pack, in GLB node order. Kept as a flat list (not
// bark/branch pairs like the tree packs) since this is one combined prop.
const PART_NODES = [
  "Object_2",
  "Object_3",
  "Object_4",
  "Object_5",
  "Object_6",
  "Object_7",
  "Object_8",
];

// Measured directly from the GLB's accessor min/max (Y-up, no axis fix
// needed): union bounds X:[-1.127,-0.899] Y:[-0.183,0.580] Z:[-0.277,0.071].
// Recenter horizontally and drop the base to y=0 so the pot sits flush on
// the ground like the other scattered props.
const RECENTER_OFFSET: [number, number, number] = [1.013, 0.183, 0.103];
const SOURCE_HEIGHT = 0.7634; // maxY - minY

// Small garden-accent scale — Task 4 spec caps ground flora stem height at
// ~0.3-0.5 units (below the character's knee); this pot+bloom prop is a
// touch taller than a bare stem so it reads as an object, but pulled well
// down from the old 0.6 (which, combined with the 0.8-1.4 instance jitter,
// produced pots up to 0.84 units tall — clearly oversized next to the
// character).
const TARGET_HEIGHT = 0.42;

export interface GlbFlowerPotProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
}

export default function GlbFlowerPot({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}: GlbFlowerPotProps) {
  const { nodes, materials } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.Material>;
  };

  const parts = useMemo(
    () =>
      PART_NODES.map((name) => nodes[name]).filter(
        (n): n is THREE.Mesh => !!n
      ),
    [nodes]
  );

  if (parts.length === 0) return null;

  const finalScale = (TARGET_HEIGHT / SOURCE_HEIGHT) * scale;

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={finalScale}>
      <group position={RECENTER_OFFSET}>
        {parts.map((part, i) => (
          <mesh
            key={PART_NODES[i]}
            geometry={part.geometry}
            material={part.material ?? materials[Object.keys(materials)[0]]}
            castShadow
            receiveShadow
          />
        ))}
      </group>
    </group>
  );
}

// Task 1: preload removed — this component is no longer mounted anywhere,
// so preloading its GLB would load an asset that's never used. Re-add
// `useGLTF.preload(MODEL_PATH);` here if flower pots are reintroduced.
