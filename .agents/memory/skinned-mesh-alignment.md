---
name: Skinned-mesh ground alignment
description: Why Box3().setFromObject() gives bogus results for skinned/rigged meshes, and what to use instead.
---

`new THREE.Box3().setFromObject(scene)` (or drei's auto-fit/`alignBottom` helpers built on it) reads the geometry's
bind-pose bounding box and does **not** account for skin/bone deformation. For a rigged character this can report a
wildly wrong height (e.g. a few centimeters instead of ~1.5+ units), because it's measuring the raw vertex buffer, not
where the skinned mesh actually ends up after the skeleton's pose is applied.

**Why:** Discovered while fixing a player character that floated above/sank below the ground and was offset sideways
from its own parent group — the root cause was a baked-in translation on the GLB's Armature node from the
Blender/Mixamo export pipeline, which Box3 completely failed to reveal or help compensate for.

**How to apply:** For any skinned/rigged mesh (character, animated prop with bones), don't use Box3 to measure height
or ground-contact offsets. Instead:
1. Call `scene.updateMatrixWorld(true)` to force FK propagation.
2. Traverse for named bones (e.g. hips for horizontal pivot, toe/foot bones for lowest ground-contact point, head-top
   bone for height) and read their `getWorldPosition()`.
3. Compute an offset vector from those world positions and apply it as the mesh's local `position` prop (not the
   parent group's), so gameplay code (ground clamp, spawn position, movement) keeps working in clean local-space units
   while the visual mesh gets shifted into alignment.

Static, non-skinned meshes (terrain, buildings) are fine with Box3 — this only matters for skinned/animated meshes.

**Gotcha — name matching must require `isBone`:** matching bones by a loose name pattern like `/hips$/i` across
`scene.traverse()` without checking `(child as THREE.Bone).isBone` is fragile: some GLB exports (esp. re-exports
through Blender/Mixamo pipelines) contain a duplicate non-bone node with a similar name (e.g. a control/IK empty)
positioned near local origin, separate from the real skinned armature joint. Overwriting "last match wins" during
traversal can silently pick the wrong node, especially across re-exported versions of the "same" file — always
require `isBone` (or otherwise confirm it belongs to the actual `SkinnedMesh.skeleton.bones` list) before trusting a
bone's world position for alignment math.
