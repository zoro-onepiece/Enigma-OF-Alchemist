import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { registerBlocker } from "../../../lib/worldCollision";
import { PLAYER_WORLD_POS } from "../../3d/Player";

/**
 * JapaneseHouse
 *
 * A small, fully enclosed traditional house (unlike the open-pillar
 * JapaneseTemple) with real walls, a sliding front door the player can open,
 * and a modest tatami interior lit by a lantern — so "going inside" is an
 * actual enclosed space, not just walking through open framework.
 *
 * The door is a real gameplay obstacle: while closed it's registered as a
 * solid wall blocker (see ../../../lib/worldCollision) so the player is
 * physically stopped at the doorway, and opening it removes that block.
 */
export interface JapaneseHouseProps {
  position?: [number, number, number];
}

const WIDTH = 6; // X extent
const DEPTH = 5; // Z extent
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.2;
const DOOR_WIDTH = 1.6;
const DOOR_HEIGHT = 2.2;

// How close (in world units) the player needs to be before the "click to
// open" hint appears above the door.
const INTERACT_RANGE = 4.5;

export default function JapaneseHouse({ position = [0, 0, 0] }: JapaneseHouseProps) {
  const [doorOpen, setDoorOpen] = useState(false);
  const [playerNear, setPlayerNear] = useState(false);
  const [hovered, setHovered] = useState(false);
  const doorOpenRef = useRef(false);
  const leftLeafRef = useRef<THREE.Group>(null);
  const rightLeafRef = useRef<THREE.Group>(null);
  const slideAmount = useRef(0); // 0 = closed, 1 = fully open

  const [px, py, pz] = position;
  const halfW = WIDTH / 2;
  const halfD = DEPTH / 2;
  const halfDoor = DOOR_WIDTH / 2;

  useEffect(() => {
    doorOpenRef.current = doorOpen;
  }, [doorOpen]);

  // Register the four wall segments (front wall is split around the door
  // gap) as solid blockers. Only the door segment's solidity can change.
  useEffect(() => {
    const cleanups = [
      // Back wall
      registerBlocker({
        minX: px - halfW,
        maxX: px + halfW,
        minZ: pz - halfD - WALL_THICKNESS,
        maxZ: pz - halfD + WALL_THICKNESS,
        isSolid: () => true,
      }),
      // Left wall
      registerBlocker({
        minX: px - halfW - WALL_THICKNESS,
        maxX: px - halfW + WALL_THICKNESS,
        minZ: pz - halfD,
        maxZ: pz + halfD,
        isSolid: () => true,
      }),
      // Right wall
      registerBlocker({
        minX: px + halfW - WALL_THICKNESS,
        maxX: px + halfW + WALL_THICKNESS,
        minZ: pz - halfD,
        maxZ: pz + halfD,
        isSolid: () => true,
      }),
      // Front wall — left stub (beside the door gap)
      registerBlocker({
        minX: px - halfW,
        maxX: px - halfDoor,
        minZ: pz + halfD - WALL_THICKNESS,
        maxZ: pz + halfD + WALL_THICKNESS,
        isSolid: () => true,
      }),
      // Front wall — right stub (beside the door gap)
      registerBlocker({
        minX: px + halfDoor,
        maxX: px + halfW,
        minZ: pz + halfD - WALL_THICKNESS,
        maxZ: pz + halfD + WALL_THICKNESS,
        isSolid: () => true,
      }),
      // The door itself — solid only while closed.
      registerBlocker({
        minX: px - halfDoor,
        maxX: px + halfDoor,
        minZ: pz + halfD - WALL_THICKNESS,
        maxZ: pz + halfD + WALL_THICKNESS,
        isSolid: () => !doorOpenRef.current,
      }),
    ];
    return () => cleanups.forEach((c) => c());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [px, pz]);

  useFrame((_state, delta) => {
    // Proximity check for the interaction hint.
    const dx = PLAYER_WORLD_POS.x - px;
    const dz = PLAYER_WORLD_POS.z - pz;
    const near = Math.hypot(dx, dz - halfD) < INTERACT_RANGE;
    setPlayerNear((prev) => (prev !== near ? near : prev));

    // Animate the two door leaves sliding sideways into the wall stubs.
    const target = doorOpen ? 1 : 0;
    slideAmount.current += (target - slideAmount.current) * Math.min(1, delta * 6);
    const slide = slideAmount.current * (halfDoor - 0.05);
    if (leftLeafRef.current) leftLeafRef.current.position.x = -halfDoor / 2 - slide;
    if (rightLeafRef.current) rightLeafRef.current.position.x = halfDoor / 2 + slide;
  });

  const roofColor = "#2b2016";
  const wallColor = "#e8dcc4";
  const trimColor = "#5a4128";

  return (
    <group position={[px, py, pz]}>
      {/* Raised stone-ish base platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <boxGeometry args={[WIDTH + 0.6, 0.3, DEPTH + 0.6]} />
        <meshStandardMaterial color="#7a7a7a" roughness={0.9} />
      </mesh>

      {/* Interior tatami floor */}
      <mesh position={[0, 0.31, 0]} receiveShadow>
        <boxGeometry args={[WIDTH - 0.3, 0.02, DEPTH - 0.3]} />
        <meshStandardMaterial color="#c9a86a" roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, WALL_HEIGHT / 2 + 0.3, -halfD]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfW, WALL_HEIGHT / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, DEPTH]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Right wall */}
      <mesh position={[halfW, WALL_HEIGHT / 2 + 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, DEPTH]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Front wall — two stubs flanking the door gap */}
      <mesh
        position={[-(halfDoor + (halfW - halfDoor) / 2), WALL_HEIGHT / 2 + 0.3, halfD]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[halfW - halfDoor, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      <mesh
        position={[halfDoor + (halfW - halfDoor) / 2, WALL_HEIGHT / 2 + 0.3, halfD]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[halfW - halfDoor, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Lintel above the door gap */}
      <mesh position={[0, DOOR_HEIGHT + 0.3 + 0.2, halfD]} castShadow>
        <boxGeometry args={[DOOR_WIDTH + 0.3, 0.4, WALL_THICKNESS]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>

      {/* Sliding door leaves — click to toggle open/closed. */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          setDoorOpen((v) => !v);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <group ref={leftLeafRef} position={[-halfDoor / 2, DOOR_HEIGHT / 2 + 0.3, halfD]}>
          <mesh castShadow>
            <boxGeometry args={[halfDoor, DOOR_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
          </mesh>
        </group>
        <group ref={rightLeafRef} position={[halfDoor / 2, DOOR_HEIGHT / 2 + 0.3, halfD]}>
          <mesh castShadow>
            <boxGeometry args={[halfDoor, DOOR_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
          </mesh>
        </group>
      </group>

      {(hovered || playerNear) && (
        <Html center distanceFactor={8} position={[0, DOOR_HEIGHT + 0.6, halfD]}>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
            Click the door to {doorOpen ? "close" : "open"} it
          </div>
        </Html>
      )}

      {/* Roof — single pyramidal tier matching the temple's low-poly style */}
      <group position={[0, WALL_HEIGHT + 0.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[WIDTH + 0.8, 0.25, DEPTH + 0.8]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[WIDTH + 1.1, 0.08, DEPTH + 1.1]} />
          <meshStandardMaterial color="#b8302e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[Math.max(WIDTH, DEPTH) * 0.72, 1.6, 4]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
      </group>

      {/* Interior lantern light so the inside isn't pitch black once the
          door is open. */}
      <group position={[0, 1.6, -halfD + 0.6]}>
        <mesh>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ffb15e" emissive="#ffb15e" emissiveIntensity={1.1} />
        </mesh>
        <pointLight color="#ffb15e" intensity={1.1} distance={7} />
      </group>
    </group>
  );
}
