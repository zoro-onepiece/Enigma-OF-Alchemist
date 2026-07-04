import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { registerBlocker } from "../../../lib/worldCollision";

/**
 * GreenLeafTree
 *
 * A cute, cartoony "adorable" tree to sit alongside the cherry blossoms and
 * quantum trees: a straight brown vertical trunk, a handful of short brown
 * branches near the top, and a cluster of rounded green icosahedron leaf
 * puffs. The whole canopy gently sways back and forth every frame (a soft
 * spring/"elastic" wobble) so it feels bouncy and alive instead of static —
 * purely a rotation oscillation, no physics engine involved.
 */
export interface GreenLeafTreeProps {
  position?: [number, number, number];
  scale?: number;
}

const BRANCH_ANGLES = [0.5, 2.1, 3.6, 5.0];

const LEAF_CLUSTER_OFFSETS: [number, number, number][] = [
  [0, 0, 0],
  [0.42, -0.08, 0.28],
  [-0.4, -0.05, -0.25],
  [0.18, 0.32, -0.32],
  [-0.28, 0.3, 0.3],
  [0.02, 0.5, 0.02],
];

export default function GreenLeafTree({
  position = [0, 0, 0],
  scale = 1,
}: GreenLeafTreeProps) {
  const canopyRef = useRef<THREE.Group>(null);

  // Per-instance phase so trees don't all sway in perfect unison.
  const phase = useMemo(
    () => Math.abs(Math.sin(position[0] * 17.13 + position[2] * 41.7)) * Math.PI * 2,
    [position],
  );

  // Solid trunk footprint so the player can't walk through the tree.
  const [px, , pz] = position;
  const radius = 0.3 * scale;
  useEffect(() => {
    return registerBlocker({
      minX: px - radius,
      maxX: px + radius,
      minZ: pz - radius,
      maxZ: pz + radius,
      isSolid: () => true,
    });
  }, [px, pz, radius]);

  useFrame((state) => {
    const canopy = canopyRef.current;
    if (!canopy) return;
    const t = state.clock.elapsedTime;
    // Gentle "elastic" wobble — a soft spring-like oscillation rather than a
    // rigid, static canopy.
    canopy.rotation.z = Math.sin(t * 1.4 + phase) * 0.035;
    canopy.rotation.x = Math.cos(t * 1.1 + phase) * 0.025;
  });

  return (
    <group position={position} scale={scale}>
      {/* Trunk — single straight vertical tapered cylinder, no lean. */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.5, 6]} />
        <meshStandardMaterial color="#5a4128" roughness={0.9} />
      </mesh>

      {/* Canopy group — branches + leaves, swaying together as one unit. */}
      <group ref={canopyRef} position={[0, 1.5, 0]}>
        {/* Branches — short brown stubs radiating outward from the trunk top */}
        {BRANCH_ANGLES.map((angle, i) => (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.16, 0.12, Math.sin(angle) * 0.16]}
            rotation={[Math.cos(angle) * 0.9, angle, Math.sin(angle) * 0.9]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.07, 0.45, 5]} />
            <meshStandardMaterial color="#5a4128" roughness={0.9} />
          </mesh>
        ))}

        {/* Leaves — clustered rounded green puffs for an adorable, chunky
            low-poly look. */}
        <group position={[0, 0.35, 0]}>
          {LEAF_CLUSTER_OFFSETS.map((offset, i) => (
            <mesh key={i} position={offset} castShadow receiveShadow>
              <icosahedronGeometry args={[0.5 - i * 0.02, 1]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#3f7d3f" : "#5aa15a"}
                roughness={0.7}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
