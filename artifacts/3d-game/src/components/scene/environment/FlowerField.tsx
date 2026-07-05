import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * FlowerField
 *
 * Instanced ground-flower scatter for the whole island, built from the
 * user-provided "anemone_flower_low_poly.glb" pack — a pre-authored bed of
 * 5 anemone flowers (nodes "Cylinder"/"Cylinder.001-004"), each split into
 * an opaque part (petals/stem) and an alpha-blended transparent part
 * (translucent petal tips), sharing just 2 materials total. None of the
 * GLB's nodes carry their own transform (positions are baked directly into
 * each mesh's vertex data), so the 5 copies can be merged as-is without
 * needing to bake per-node world matrices first.
 *
 * We merge all 5 opaque geometries into one BufferGeometry and all 5
 * transparent geometries into another, then draw each as a single
 * InstancedMesh sharing the same per-placement transforms — so N flower-bed
 * placements cost exactly 2 draw calls total (not 2*N) regardless of count.
 *
 * Shadows off (cast + receive) to keep hundreds of instances cheap — same
 * reasoning as the old grass tufts had.
 */
const MODEL_PATH = "/models/anemone_flower.glb";

const OPAQUE_NODES = [
  "Cylinder_anemone_opague_1_0",
  "Cylinder.001_anemone_opague_1_0",
  "Cylinder.002_anemone_opague_1_0",
  "Cylinder.003_anemone_opague_1_0",
  "Cylinder.004_anemone_opague_1_0",
];
const TRANSPARENT_NODES = [
  "Cylinder_anemone_transparent_0",
  "Cylinder.001_anemone_transparent_0",
  "Cylinder.002_anemone_transparent_0",
  "Cylinder.003_anemone_transparent_0",
  "Cylinder.004_anemone_transparent_0",
];

// Measured directly from the GLB's accessor min/max (Y-up, no axis fix
// needed): union bounds X:[-5.627,4.978] Y:[-2.863,3.076] Z:[~0,16.418].
// Recenter the X/Z footprint and drop the base to y=0 so the flower bed
// sits flush on the ground like the other scattered props.
const RECENTER_OFFSET = new THREE.Vector3(0.3247, 2.8633, -8.2092);
const SOURCE_HEIGHT = 5.9396; // maxY - minY (single-flower stem-to-petal height)

// Knee-height-or-below ground flower, proportionate to the grass/character
// — same target as before, scaling the whole 5-flower bed down together.
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

  const opaqueGeometry = useMemo(() => {
    const geoms = OPAQUE_NODES.map((n) => nodes[n]?.geometry).filter(
      (g): g is THREE.BufferGeometry => !!g
    );
    if (geoms.length === 0) return null;
    return mergeGeometries(geoms.map((g) => g.clone()));
  }, [nodes]);

  const transparentGeometry = useMemo(() => {
    const geoms = TRANSPARENT_NODES.map((n) => nodes[n]?.geometry).filter(
      (g): g is THREE.BufferGeometry => !!g
    );
    if (geoms.length === 0) return null;
    return mergeGeometries(geoms.map((g) => g.clone()));
  }, [nodes]);

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

  if (placements.length === 0) return null;

  return (
    <>
      {opaqueGeometry && materials.anemone_opague_1 && (
        <instancedMesh
          args={[opaqueGeometry, undefined, placements.length]}
          castShadow={false}
          receiveShadow={false}
          frustumCulled={false}
          ref={(mesh) => {
            if (!mesh) return;
            matrices.forEach((m, j) => mesh.setMatrixAt(j, m));
            mesh.instanceMatrix.needsUpdate = true;
          }}
        >
          <primitive object={materials.anemone_opague_1} attach="material" />
        </instancedMesh>
      )}
      {transparentGeometry && materials.anemone_transparent && (
        <instancedMesh
          args={[transparentGeometry, undefined, placements.length]}
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
            object={materials.anemone_transparent}
            attach="material"
          />
        </instancedMesh>
      )}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
