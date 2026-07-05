import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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

// Task 4 root-cause fix: this model is NOT Y-up despite the earlier
// assumption. Measured directly from the GLB's accessor min/max: the stem
// (opaque part) runs along Z from ~0 to 14.76, and the bloom (transparent
// part) sits at the far end, Z:[9.52,16.42] — i.e. the flower's actual
// "up" axis is local +Z, with X/Y only spanning the bloom's lateral
// width/wobble (X:[-5.63,4.98], Y:[-2.86,3.08]). Treating Y as height (the
// old code) used the bloom's ~5.9-unit lateral spread as the "height" and
// never rotated the stem upright — which is exactly why the flowers read
// as lying flat instead of standing planted in the ground.
//
// Fix: recenter X and Y (so the stem's local growth axis, Z, is centered
// over the placement point) BEFORE rotating local Z onto world +Y with a
// -90 degrees rotation about X: (x, y, z) -> (x, z, -y). The stem base
// (z≈0) already sits at the rotation's origin, so it lands exactly at
// y=0, and Z's full range (0 to 16.42) becomes the model's true height.
const RECENTER_OFFSET = new THREE.Vector3(0.3245, -0.1065, 0);
const AXIS_FIX_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);
const SOURCE_HEIGHT = 16.418; // true stem-base-to-petal-tip height (was local Z)

// Ground flower height, per spec: 0.3-0.5 world units (below the
// character's knee) so each flower bed reads as small ground flora, not a
// waist-high clump.
const TARGET_HEIGHT = 0.45;

// Sink the base slightly below y=0 (world units, applied after scaling) so
// the flowers look embedded/rooted in the ground instead of floating on
// top of it — small enough not to bury the visible petals.
const EMBED_DEPTH = 0.02;

function attachWindSway(
  material: THREE.Material,
  windUniform: { value: number }
): THREE.Material {
  const mat = material.clone();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader =
      "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float windPhase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3;
      // Task 4 axis fix follow-through: local Z is the true stem-to-petal
      // height axis (see AXIS_FIX_ROTATION above, which rotates local Z
      // onto world +Y), so height-weighting and sway must use local Z/X/Y
      // — not the old Y-up assumption's Y/X/Z, which would now animate
      // the stem's *height* (stretching it) instead of swaying it sideways.
      float heightWeight = clamp(position.z / 16.418, 0.0, 1.0);
      float sway = sin(uTime * 1.6 + windPhase) * 0.35 * heightWeight * heightWeight;
      transformed.x += sway;
      transformed.y += sway * 0.6;`
    );
  };
  mat.customProgramCacheKey = () => "flower-wind-sway";
  return mat;
}

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

  const windUniform = useRef({ value: 0 }).current;
  useFrame((state) => {
    windUniform.value = state.clock.elapsedTime;
  });

  const opaqueMaterial = useMemo(
    () =>
      materials.anemone_opague_1
        ? attachWindSway(materials.anemone_opague_1, windUniform)
        : null,
    [materials, windUniform]
  );

  const transparentMaterial = useMemo(
    () =>
      materials.anemone_transparent
        ? attachWindSway(materials.anemone_transparent, windUniform)
        : null,
    [materials, windUniform]
  );

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
    // Recenter first (in the model's original axes), then rotate local Z
    // onto world +Y — order matters: composing rotation * translation
    // means the translation is applied to the point first, then the
    // rotation, which is what puts the (already-centered) stem upright.
    const local = new THREE.Matrix4()
      .makeRotationFromEuler(AXIS_FIX_ROTATION)
      .multiply(
        new THREE.Matrix4().makeTranslation(
          RECENTER_OFFSET.x,
          RECENTER_OFFSET.y,
          RECENTER_OFFSET.z
        )
      );
    const finalScaleBase = TARGET_HEIGHT / SOURCE_HEIGHT;

    return placements.map((p) => {
      const outer = new THREE.Matrix4().compose(
        new THREE.Vector3(
          p.position[0],
          p.position[1] - EMBED_DEPTH,
          p.position[2]
        ),
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
      {opaqueGeometry && opaqueMaterial && (
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
          <primitive object={opaqueMaterial} attach="material" />
        </instancedMesh>
      )}
      {transparentGeometry && transparentMaterial && (
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
          <primitive object={transparentMaterial} attach="material" />
        </instancedMesh>
      )}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
