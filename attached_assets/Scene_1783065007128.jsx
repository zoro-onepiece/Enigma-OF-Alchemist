// src/Scene.jsx
// Everything INSIDE the R3F <Canvas> for "Enigma of Alchemist".
// Updated for YOUR actual models: low_poly_forest.glb (+ optimized tree scene).

import React, { Suspense } from "react";
import { OrbitControls, Sky, Environment } from "@react-three/drei";
import { WorldModel } from "./WorldModel";

export default function Scene() {
  return (
    <>
      {/* ── LIGHTING (required for shadows) ─────────────────────────── */}
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        position={[15, 25, 10]}
        intensity={1.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />

      {/* ── SKY / ATMOSPHERE ────────────────────────────────────────── */}
      <Sky sunPosition={[15, 25, 10]} turbidity={6} rayleigh={1.2} />
      <Environment preset="sunset" />

      <Suspense fallback={null}>
        {/* ── MAIN WORLD: your forest terrain ─────────────────────────
            Auto-fitted to ~50 units wide, ground resting at y=0.
            It contains grnd, slope, water, flowers, and leaves. */}
        <WorldModel
          url="/models/low_poly_forest.glb"
          targetSize={50}
          position={[0, 0, 0]}
        />

        {/* ── EXTRA TREES: enable AFTER running the compression step ──
            The raw low_poly_tree_scene_free.glb has 2,712 draw calls
            and WILL freeze Replit. Compress it first (instructions),
            save as trees_optimized.glb, then uncomment:

        <WorldModel
          url="/models/trees_optimized.glb"
          targetSize={30}
          position={[8, 0.1, -10]}
        />
        */}

        {/* ── CHARACTER SLOT ──────────────────────────────────────────
            Your teammate's anime-girl component goes here, e.g.:
            <Character position={[0, 0.1, 0]} />
            (World bottom sits at y=0, so spawn the character slightly
             above and let gravity/controller settle her.)
        ─────────────────────────────────────────────────────────────── */}
      </Suspense>

      {/* Temporary camera while the third-person controller is WIP */}
      <OrbitControls
        maxPolarAngle={Math.PI / 2.05}
        minDistance={5}
        maxDistance={60}
        target={[0, 2, 0]}
      />
    </>
  );
}
