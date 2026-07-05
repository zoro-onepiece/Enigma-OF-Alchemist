import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * FlowerField
 *
 * Instanced ground-flower scatter for the whole island, built from the
 * same "low_poly_flowers.glb" pack as GlbFlowerPot — but here we drop the
 * pot/vase mesh (material "Paint_hand_brushed_gloss_finish", node
 * Object_8) since a wild ground flower shouldn't have a vase attached,
 * leaving just the bloom + leaf parts as one small flower "plant".
 *
 * Each of the 6 remaining mesh parts gets its own InstancedMesh sharing
 * the same per-placement transforms, so N flower placements cost exactly
 * 6 draw calls total (not 6*N) regardless of instance count.
 *
 * Shadows off (cast + receive) to keep hundreds of instances cheap — same
 * reasoning as GrassTufts.
 */
const MODEL_PATH = "/models/flower_pack.glb";

// All parts except Object_8 (the pot/vase).
const PART_NODES = [
  "Object_2",
  "Object_3",
  "Object_4",
  "Object_5",
  "Object_6",
  "Object_7",
];

// Same measured bounds as GlbFlowerPot (Y-up, no axis fix needed).
const RECENTER_OFFSET = new THREE.Vector3(1.013, 0.183, 0.103);
const SOURCE_HEIGHT = 0.7634; // maxY - minY

// Knee-height-or-below ground flower, proportionate to the grass/character.
const TARGET_HEIGHT = 0.35;

export interface FlowerFieldPlacement {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface FlowerFieldProps {
  placements: FlowerFieldPlacement[];
}

export default function FlowerField({ placements }: FlowerFieldProps) {
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

  const matrices = useMemo(() => {
    const local = new THREE.Matrix4().makeTranslation(
      RECENTER_OFFSET.x,
      RECENTER_OFFSET.y,
      RECENTER_OFFSET.z
    );
    const finalScaleBase = TARGET_HEIGHT / SOURCE_HEIGHT;

    return placements.map((p) => {
      const outer = new THREE.Matrix4().compose(
        new THREE.Vector3(...p.position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotationY, 0)),
        new THREE.Vector3(
          finalScaleBase * p.scale,
          finalScaleBase * p.scale,
          finalScaleBase * p.scale
        )
      );
      return outer.multiply(local);
    });
  }, [placements]);

  if (parts.length === 0 || placements.length === 0) return null;

  return (
    <>
      {parts.map((part, i) => (
        <instancedMesh
          key={PART_NODES[i]}
          args={[part.geometry, undefined, placements.length]}
          castShadow={false}
          receiveShadow={false}
          frustumCulled={false}
          ref={(mesh) => {
            if (!mesh) return;
            matrices.forEach((m, j) => mesh.setMatrixAt(j, m));
            mesh.instanceMatrix.needsUpdate = true;
          }}
        >
          <primitive
            object={
              part.material ?? materials[Object.keys(materials)[0]]
            }
            attach="material"
          />
        </instancedMesh>
      ))}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
