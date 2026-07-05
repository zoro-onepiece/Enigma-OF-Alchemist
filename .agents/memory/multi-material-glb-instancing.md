---
name: Instancing multi-material GLB props in R3F
description: How to GPU-instance a GLB prop that has several mesh parts/materials (e.g. a flower with stem+bloom+leaf) for dense scatter.
---

drei's `<Instances>`/`<Instance>` and a single `THREE.InstancedMesh` both assume one geometry + one material per batch. A GLB prop with multiple parts (different materials per node) can't be instanced as one mesh.

**Pattern:** create one `InstancedMesh` per mesh part, but drive all of them from the *same* array of per-placement transform matrices (position/rotation/scale, with the part's local recenter offset baked in via `matrix.multiply(localOffsetMatrix)`). N placements then cost exactly `(number of parts)` draw calls total, not `N * parts` — e.g. a 6-part flower scattered 450 times is 6 draw calls, not 2700.

**Why:** discovered while instancing a multi-part flower GLB (stem/bloom/leaf/pot as separate nodes+materials) for dense ground scatter; naively wrapping each placement in its own `<group>` of meshes (fine for tens of instances, as in a "potted flower" decoration) doesn't scale to hundreds/thousands of instances.

**How to apply:** when scattering hundreds+ of a multi-part prop, extract per-part geometries/materials from `useGLTF`, precompute one shared matrix array, and render one `instancedMesh` per part with `castShadow={false}`/`receiveShadow={false}` if it's dense ground cover.
