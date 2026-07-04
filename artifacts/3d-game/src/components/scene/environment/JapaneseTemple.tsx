/**
 * JapaneseTemple
 *
 * A stylized low-poly temple built entirely from primitives: a raised stone
 * platform, vermilion pillars, a dark wood floor, a two-tier pagoda roof
 * (flared via scaled box "eave" slabs rather than a real curved mesh — cheap
 * and reads fine at low-poly distances), and two warm paper-lantern lights
 * near the entrance.
 */
export interface JapaneseTempleProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

const PILLAR_OFFSETS: [number, number][] = [
  [-3.2, -2.2],
  [3.2, -2.2],
  [-3.2, 2.2],
  [3.2, 2.2],
  [-3.2, 0],
  [3.2, 0],
];

export default function JapaneseTemple({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: JapaneseTempleProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Raised stone platform base */}
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[9, 0.8, 6]} />
        <meshStandardMaterial color="#6b6b6b" roughness={0.9} />
      </mesh>

      {/* Dark wood floor on top of the platform */}
      <mesh position={[0, 0.82, 0]} receiveShadow>
        <boxGeometry args={[8.4, 0.05, 5.4]} />
        <meshStandardMaterial color="#3b2a1e" roughness={0.7} />
      </mesh>

      {/* Vermilion pillars */}
      {PILLAR_OFFSETS.map(([x, z], i) => (
        <mesh key={i} position={[x, 2.2, z]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 3.2, 8]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
      ))}

      {/* Roof — lower tier */}
      <group position={[0, 4.0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[10.5, 0.35, 7.5]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
        {/* Red trim edge */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[10.8, 0.1, 7.8]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
        {/* Flared silhouette — low-poly cone rotated 45°, 4 radial segments */}
        <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[6.2, 1.4, 4]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
      </group>

      {/* Roof — upper tier, smaller, sitting on top of the lower tier's peak */}
      <group position={[0, 5.6, 0]}>
        <mesh castShadow>
          <boxGeometry args={[6.5, 0.3, 4.8]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[6.8, 0.1, 5.1]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[3.8, 1.8, 4]} />
          <meshStandardMaterial color="#1c1c1c" roughness={0.6} />
        </mesh>
      </group>

      {/* Paper lanterns near the entrance (+Z side, facing the pathway) */}
      {[-2, 2].map((x, i) => (
        <group key={i} position={[x, 1.8, 3.4]}>
          <mesh castShadow>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#ff9d4d" emissive="#ff9d4d" emissiveIntensity={1.2} />
          </mesh>
          <pointLight color="#ff9d4d" intensity={0.9} distance={5} />
        </group>
      ))}
    </group>
  );
}
