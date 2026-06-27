/**
 * GameEnvironment
 *
 * Anime-style world environment: skybox, fog, ambient + directional lighting,
 * terrain, and static props.
 *
 * TODO:
 *   - Replace <Environment preset="night"> with a custom HDRI via environmentFiles
 *   - Load terrain .glb with useGLTF and add navmesh data
 *   - Add fog (<fogExp2 />) for depth atmosphere
 *   - Populate decorative objects (trees, ruins, glowing crystals)
 */
import { Environment, Sky } from "@react-three/drei";

export default function GameEnvironment() {
  return (
    <>
      <ambientLight intensity={0.35} color="#b4c8ff" />
      <directionalLight
        position={[15, 20, 10]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#ffe8c0"
      />

      {/* Anime-style dusk sky — swap with custom HDRI */}
      <Sky
        distance={450000}
        sunPosition={[0, 0.1, -1]}
        inclination={0.49}
        azimuth={0.25}
      />

      <Environment preset="night" />

      {/* Terrain placeholder */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 64, 64]} />
        <meshStandardMaterial color="#1a2e1a" roughness={0.9} />
      </mesh>
    </>
  );
}
