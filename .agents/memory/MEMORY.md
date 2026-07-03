# Memory Index

- [Skinned-mesh ground alignment](skinned-mesh-alignment.md) — Box3().setFromObject() is unreliable on skinned meshes (ignores skin deformation); use bone world positions (FK) instead.
- [3D orbit-camera forward vector sign](orbit-camera-forward-sign.md) — the player→camera offset vector is the opposite of "where the camera is looking"; movement must use the negated vector.
- [No-GPU sandbox limits](no-gpu-sandbox-3d.md) — this Replit sandbox has no GPU; WebGL/Canvas-based R3F content can't be visually verified or e2e-tested here, only via math/typecheck + user's own browser.
