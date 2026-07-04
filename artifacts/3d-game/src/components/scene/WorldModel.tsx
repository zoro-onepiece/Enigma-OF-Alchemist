// @ts-nocheck
// src/WorldModel.jsx
// Tailored for YOUR actual models:
//   - low_poly_forest.glb          (ground/slope/water — ~10,000 units wide!)
//   - low_poly_tree_scene_free.glb (pre-scattered trees & grass)
//
// Why auto-fit? Your forest GLB was exported from FBX with centimeter-scale
// units, so at scale={1} it is ~10,000 units across. This component measures
// the model with a Box3 and scales/centers it to a size YOU choose, so
// "targetSize={40}" always means "about 40 world units wide" for any model.

import React, { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export function WorldModel({
  url,
  targetSize = 40,        // desired largest dimension in world units
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  alignBottom = true,     // rest the model's lowest point at y = position[1]
  ...props
}) {
  const { scene } = useGLTF(url);

  const { clonedScene, fittedScale, offset } = useMemo(() => {
    const clone = scene.clone(true);

    // Enable shadows on every mesh
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Measure the real size of the model
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Scale so the largest dimension equals targetSize
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = targetSize / maxDim;

    // Figure out where the WALKABLE surface actually is.
    //
    // low_poly_forest.glb is not a simple box — it's an island with grass
    // on top, cliffs (a "slope" mesh) on the sides, and a separate "water"
    // mesh sitting below/around it. `box.min.y` (the lowest point of the
    // ENTIRE model) is the bottom of the cliff/slope mesh, not the grass
    // surface the player needs to stand on. Aligning that global minimum to
    // y=0 (the old behavior) left the actual grass dozens of units above
    // the player. Instead, raycast straight down through the model at the
    // exact X/Z column that will become this group's local (0, 0) — i.e.
    // where the player spawns — and use the height of whatever terrain
    // surface is hit there. We only raycast against meshes whose name
    // looks like terrain (ground/slope), so we hit the actual walkable
    // surface instead of tree canopies, petals, or bark that might also
    // sit above that column.
    let groundY = box.min.y;
    if (alignBottom) {
      const terrainMeshes: THREE.Object3D[] = [];
      clone.traverse((child) => {
        if (child.isMesh && /grnd|ground|slope|terrain/i.test(child.name)) {
          terrainMeshes.push(child);
        }
      });

      const raycaster = new THREE.Raycaster();
      raycaster.set(
        new THREE.Vector3(center.x, box.max.y + 1, center.z),
        new THREE.Vector3(0, -1, 0)
      );
      raycaster.far = box.max.y - box.min.y + 2;

      const hits = raycaster.intersectObjects(
        terrainMeshes.length > 0 ? terrainMeshes : [clone],
        true
      );

      if (hits.length > 0) {
        // Closest hit = topmost surface under the spawn column (i.e. the
        // grass/ground itself, since we already excluded foliage meshes).
        groundY = hits[0].point.y;
      }
    }

    // Offset so the model is centered on X/Z, and (optionally) the real
    // walkable surface under the spawn point sits exactly at y=0 of this
    // component.
    const off = new THREE.Vector3(
      -center.x * s,
      alignBottom ? -groundY * s : -center.y * s,
      -center.z * s
    );

    return { clonedScene: clone, fittedScale: s, offset: off };
  }, [scene, targetSize, alignBottom]);

  return (
    <group position={position} rotation={rotation} {...props}>
      <primitive
        object={clonedScene}
        scale={fittedScale}
        position={[offset.x, offset.y, offset.z]}
      />
    </group>
  );
}

// Preload your actual models
useGLTF.preload("/models/low_poly_forest.glb");

/* ── Usage with YOUR files (see Scene.jsx) ──────────────────────────────────

// Main walkable world — forest terrain with ground, slope, and water,
// fitted to ~50 units wide, bottom resting at y = 0:
<WorldModel url="/models/low_poly_forest.glb" targetSize={50} position={[0, 0, 0]} />

// The tree scene — ONLY use this AFTER compressing it (see the optimization
// step in the instructions). Uncompressed it has 2,712 draw calls and will
// freeze the Replit preview:
<WorldModel url="/models/trees_optimized.glb" targetSize={30} position={[0, 0.2, -5]} />
──────────────────────────────────────────────────────────────────────────── */
