---
name: No-GPU sandbox limits for 3D/WebGL work
description: This Replit dev sandbox has no GPU — WebGL/Canvas content can't be screenshotted, visually verified, or e2e-tested here.
---

The Replit workspace sandbox used for previews/screenshots has no GPU access. Any React Three Fiber / WebGL canvas
falls back to a "WebGL Unavailable" placeholder in this environment (if such a fallback exists in the app) or simply
fails to render. This means:

- `screenshot(type="app_preview")` on a 3D scene shows the fallback UI, not the actual rendered game — it's still
  useful to confirm the app boots without a JS crash, but proves nothing about visual correctness (camera framing,
  model alignment, etc.).
- The `runTest`/testing-subagent flow hits the same WebGL fallback boundary and can't exercise any code that only
  runs inside the `<Canvas>` (e.g. a `useFrame` loop, camera rig, skinned character logic).

**Why:** Learned while fixing camera distance, player ground alignment, and WASD-direction bugs in a React Three
Fiber game — all three bugs lived entirely inside the Canvas, so no in-sandbox tool could visually confirm the fix.

**How to apply:** For this class of bug, validate via math/geometry analysis (e.g. reconstructing GLTF bone
transforms with plain THREE.js Object3D graphs, not GLTFLoader, to sidestep Node-side image-loading issues) and
`tsc --noEmit`/typecheck, then clearly tell the user the visual result needs confirmation in their own browser (or a
deployed/published build) since the sandbox cannot render WebGL.
