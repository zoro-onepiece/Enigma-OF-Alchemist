---
name: 3D orbit-camera forward vector sign
description: Common sign-inversion bug in manual spherical/orbit third-person cameras that inverts WASD movement.
---

In a hand-rolled spherical/orbit third-person camera (camera orbits a target at `target + distance * sphericalOffset`,
then `camera.lookAt(target)`), the vector built from `(sin(yaw), ..., cos(yaw))` points from the **target toward the
camera** — it is the offset, not the view direction. The camera's actual forward/look direction is the negation of
that vector.

**Why:** If gameplay movement code reuses that same un-negated offset vector as "camera forward" for WASD-relative
movement, all four directions come out inverted (W moves toward the viewer/camera instead of away into the screen,
and A/D swap too, since strafe is usually `cross(camForward, worldUp)` and inherits the sign flip).

**How to apply:** When implementing camera-relative movement alongside a manual orbit camera, always derive the
movement-forward vector as the negation of the orbit-offset vector (or equivalently, computed directly from
`target - camera.position`), never reuse the raw spherical-offset vector used to position the camera itself.
