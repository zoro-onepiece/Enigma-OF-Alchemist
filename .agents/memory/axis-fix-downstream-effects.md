---
name: Axis-fix rotations must be propagated to all consumers of local vertex space
description: When a GLB model's true "up" axis differs from the Y-up assumption and you fix it via a rotation matrix, any vertex-shader effects (wind sway, height-weighting, etc.) that reference local position.x/y/z must be updated too — they operate in pre-rotation local space and silently keep using the wrong axis otherwise.
---

Fixing a mesh's orientation via an instance/local transform matrix (e.g. rotating local Z onto world +Y) does NOT change what `position.xyz` means inside a vertex shader's `#include <begin_vertex>` — that still reads the original, un-rotated local vertex coordinates.

**Why:** In this project, an anemone flower GLB's stem grew along local Z, not Y as originally assumed. The position/scale bug was fixed with a rotation matrix, but a wind-sway shader still computed "height" from local Y and displaced vertices along local X/Z (valid under the old Y-up assumption). Left alone, this would have animated the stem's *height* (stretching) instead of swaying it sideways, since local Z is now the true height axis feeding into the rotation.

**How to apply:** Whenever you correct a mesh's local axis assumptions (rotation to fix "lying flat" / wrong orientation bugs), grep for any other code reading raw `position.x/y/z` in shaders or vertex-space logic for that mesh (wind sway, height-based effects, custom attributes) and update them to the corrected axis mapping too.
