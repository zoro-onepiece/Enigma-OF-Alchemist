---
name: R3F/drei prop API gotchas
description: Non-obvious prop shapes for common react-three-fiber/drei elements that fail typecheck if guessed from memory.
---

- `<bufferAttribute>` in R3F does not accept separate `count`/`array`/`itemSize` props — pass `args={[typedArray, itemSize]}` instead (mirrors the `THREE.BufferAttribute` constructor).
- drei's `<PositionalAudio>` (and similar audio wrappers) has no `volume` prop. Attach a `ref`, then call `ref.current.setVolume(...)` imperatively in an effect to control/mute volume.

**Why:** Both compile fine by analogy with plain THREE.js usage but fail TS2741/TS2322 under drei's stricter generated prop types — worth checking drei's `.d.ts` before assuming a prop exists.

**How to apply:** When adding any new drei/R3F element you haven't used in this codebase before, grep its `.d.ts` in `node_modules/@react-three/drei` for the actual prop union before writing JSX.
