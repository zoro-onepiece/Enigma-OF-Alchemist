---
name: Legacy GLB specular-glossiness materials render blank in three.js
description: KHR_materials_pbrSpecularGlossiness is unsupported by three.js's GLTFLoader (incl. three-stdlib) — textures silently fail to apply.
---

Some GLB exporters (older Sketchfab/Blender pipelines) write materials using
the legacy `KHR_materials_pbrSpecularGlossiness` extension instead of the
standard `pbrMetallicRoughness` workflow. three.js's GLTFLoader (and the
three-stdlib copy drei's `useGLTF` uses) does not implement this extension —
it prints `THREE.GLTFLoader: Unknown extension "KHR_materials_pbrSpecularGlossiness"`
and silently skips the whole material block, so the diffuse texture never
gets applied and the mesh renders as a plain untextured white material.

**Why:** discovered when a user-uploaded butterfly.glb loaded with no error
but would have rendered blank/white in-game; the only signal was a console
*warning* (not an error), easy to dismiss as harmless.

**How to apply:** when a newly uploaded GLB's material only has an
`extensions.KHR_materials_pbrSpecularGlossiness` block (check via a quick
Node script reading the GLB's JSON chunk) and no top-level
`pbrMetallicRoughness`, patch the GLB directly: rewrite `materials[n]` to add
`pbrMetallicRoughness: { baseColorTexture: { index: <same diffuseTexture.index> }, baseColorFactor: <diffuseFactor>, metallicFactor: 0, roughnessFactor: ~0.7 }`,
delete the old extension block, then re-pack the GLB (JSON chunk padded to
4-byte boundary with spaces, binary chunk untouched, header lengths updated).
Verify by re-parsing the JSON chunk afterward and confirming the loader
warning disappears in fresh browser console logs.
