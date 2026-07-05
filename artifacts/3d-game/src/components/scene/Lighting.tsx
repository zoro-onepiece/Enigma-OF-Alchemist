import { PLAYER_SPAWN } from "../3d/Player";

// Extracted from Scene.tsx so lighting setup can be reused/tuned in one
// place. Positions are centered on PLAYER_SPAWN (not the world origin)
// since the character doesn't necessarily spawn at [0,0,0] forever, and
// shadow frustums are sized for the ~250-unit-wide scaled-up forest.

// Shared with Scene.tsx's <Sky sunPosition={SUN_POSITION}> so the visible
// sun and the shadow-casting directional light below always point the same
// direction — high overhead, low turbidity daytime sun.
export const SUN_POSITION: [number, number, number] = [120, 90, 60];

export default function Lighting() {
  return (
    <>
      {/* Soft fill for the anime character skin */}
      <ambientLight intensity={0.55} color="#d4c8ff" />

      {/* Key light — warm from front-left. */}
      <directionalLight
        position={[PLAYER_SPAWN[0] + 6, 12, PLAYER_SPAWN[2] + 8]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        target-position={PLAYER_SPAWN}
        color="#fff5e0"
      />

      {/* Rim light — cool from behind to separate character from bg */}
      <directionalLight
        position={[PLAYER_SPAWN[0] - 4, 6, PLAYER_SPAWN[2] - 8]}
        intensity={0.6}
        color="#8ecfff"
      />

      {/* Purple fill from below for anime dungeon vibe */}
      <pointLight
        position={[PLAYER_SPAWN[0], 0.3, PLAYER_SPAWN[2]]}
        intensity={0.4}
        color="#7c3aed"
        distance={8}
      />

      {/* Shadow-casting sun light — re-centered on spawn, sized for the
          ~250-unit-wide forest. Direction matches SUN_POSITION (the same
          vector Scene.tsx feeds to <Sky>), scaled down to a nearby offset
          so the shadow camera frustum below still frames the play area —
          only the direction needs to match, not the absolute distance. */}
      <directionalLight
        castShadow
        position={[
          PLAYER_SPAWN[0] + SUN_POSITION[0] / 4,
          SUN_POSITION[1] / 4,
          PLAYER_SPAWN[2] + SUN_POSITION[2] / 4,
        ]}
        intensity={1.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={0.5}
        shadow-camera-far={150}
        target-position={PLAYER_SPAWN}
      />

      {/* Hemisphere light for sky/ground color blending */}
      <hemisphereLight color="#87CEEB" groundColor="#4a7c59" intensity={0.35} />
    </>
  );
}
