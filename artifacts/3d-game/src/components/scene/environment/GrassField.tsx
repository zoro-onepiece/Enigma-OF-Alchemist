import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GrassField
 *
 * Instanced grass-blade scatter for the whole island, built from the
 * user-provided "patch_of_grass.glb". Replaces FlowerField as the ground-
 * cover system (see GameEnvironment.tsx's grassField placement generator).
 *
 * ── Why this doesn't use the GLB's own ~9,436 blade nodes directly ──────
 * The asset ships one mesh node per blade ("Plane.NNNN_grass_0" — 9,436 of
 * them), clearly intended to already form a scattered patch. But every
 * node (and every one of their wrapper parents) has an identity transform,
 * and — confirmed by reading the raw vertex bytes directly out of the
 * GLB's binary buffer, not just cached accessor min/max metadata, which
 * can go stale — every single blade's geometry is byte-for-byte identical.
 * The per-instance scatter transform never got baked in before export (a
 * known pitfall with Blender particle/geometry-node scatters that aren't
 * "realized" before exporting), so loading the scene as-is renders ~9,436
 * copies of ONE blade stacked exactly on top of each other at the origin —
 * not a patch. The "Soil" sub-mesh is dropped too: it's authored flat in
 * the model's own XY plane (Z near-zero) while the blade's own "up" axis
 * is local Y — a different convention for the same file — and it would
 * duplicate GameEnvironment's own ground plane anyway.
 *
 * So: only one blade's geometry (deduplicated) and the "grass" material
 * are actually usable. This component treats that blade as a reusable
 * prop and does its own scattering — via InstancedMesh, driven by the
 * jittered-grid + per-cell tuft placements GameEnvironment.tsx generates —
 * exactly the same architecture FlowerField used for the anemone flowers,
 * just with a single (not merged multi-part) geometry.
 */
const MODEL_PATH = "/models/patch_of_grass.glb";
// Any one blade node works — every one of the ~9,436 is geometrically
// identical (see file header). This is simply the first in the file.
//
// NOTE: the raw glTF node name is "Plane.002_grass_0" (with a dot), but
// three.js's GLTFLoader strips dots when building each Object3D's `.name`
// — confirmed by actually parsing this file with GLTFLoader, not just
// reading the raw glTF JSON — so drei's `nodes` map (which is keyed by the
// post-parse `.name`) has "Plane002_grass_0" instead. The dotted version
// silently matched nothing, so this component always rendered null — that
// was the entire "grass not appearing" regression.
const BLADE_NODE_NAME = "Plane002_grass_0";

// Recenter (raw blade space) — measured directly from the blade's own
// accessor bounds: X:[-0.257,-0.045], Y:[-0.045,16.041], Z:[-0.088,0.471].
// Centers X/Z on the blade's own midpoint and drops its base (min Y) to 0,
// so placement matrices position the blade's root, not some offset point.
const RECENTER_OFFSET = new THREE.Vector3(0.150955, 0.045055, -0.191715);
const SOURCE_HEIGHT = 16.086335; // max Y - min Y, in raw blade units

// Small ground-level blade height. Reduced further (0.3 -> 0.21 -> 0.15)
// so blades read as smaller/more delicate relative to the character —
// GameEnvironment.tsx's grassField generator raises BLADES_PER_TUFT to
// compensate (smaller blades cover less ground each, so more of them are
// needed to keep the same gap-free coverage).
const TARGET_HEIGHT = 0.15;

function attachWindSway(
  material: THREE.Material,
  windUniform: { value: number },
): THREE.Material {
  const mat = material.clone();
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float windPhase = instanceMatrix[3].x * 1.9 + instanceMatrix[3].z * 1.4;
      float heightWeight = clamp(position.y / ${SOURCE_HEIGHT.toFixed(6)}, 0.0, 1.0);
      float sway = sin(uTime * 2.2 + windPhase) * 0.25 * heightWeight * heightWeight;
      transformed.x += sway;
      transformed.z += sway * 0.5;`,
    );
  };
  mat.customProgramCacheKey = () => "grass-wind-sway";
  return mat;
}

export interface GrassFieldPlacement {
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface GrassFieldProps {
  placements: GrassFieldPlacement[];
}

export default function GrassField({ placements }: GrassFieldProps) {
  const { nodes, materials } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.Material>;
  };

  const windUniform = useRef({ value: 0 }).current;
  useFrame((state) => {
    windUniform.value = state.clock.elapsedTime;
  });

  const bladeGeometry = useMemo(
    () => nodes[BLADE_NODE_NAME]?.geometry ?? null,
    [nodes],
  );

  const bladeMaterial = useMemo(
    () =>
      materials.grass ? attachWindSway(materials.grass, windUniform) : null,
    [materials, windUniform],
  );

  const matrices = useMemo(() => {
    const recenter = new THREE.Matrix4().makeTranslation(
      RECENTER_OFFSET.x,
      RECENTER_OFFSET.y,
      RECENTER_OFFSET.z,
    );
    const finalScaleBase = TARGET_HEIGHT / SOURCE_HEIGHT;

    return placements.map((p) => {
      const outer = new THREE.Matrix4().compose(
        new THREE.Vector3(p.position[0], p.position[1], p.position[2]),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, p.rotationY, 0)),
        new THREE.Vector3(
          finalScaleBase * p.scale,
          finalScaleBase * p.scale,
          finalScaleBase * p.scale,
        ),
      );
      return outer.multiply(recenter);
    });
  }, [placements]);

  if (placements.length === 0 || !bladeGeometry || !bladeMaterial) return null;

  return (
    <instancedMesh
      args={[bladeGeometry, undefined, placements.length]}
      castShadow={false}
      receiveShadow={false}
      frustumCulled={false}
      ref={(mesh) => {
        if (!mesh) return;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
      }}
    >
      <primitive object={bladeMaterial} attach="material" />
    </instancedMesh>
  );
}

// Deliberately NOT eagerly preloaded — see Player.tsx's identical note.
// This asset is 17.7MB (by far the largest single GLB in the game); it
// only fetches once GrassField actually mounts (gameplay), not on every
// page load including the login screen.
