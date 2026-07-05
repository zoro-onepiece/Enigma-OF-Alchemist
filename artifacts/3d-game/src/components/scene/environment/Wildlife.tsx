/**
 * Wildlife (Task 4)
 *
 * Pure procedural, no-GLB, no-physics ambient life: a couple of birds
 * circling high above the temple. Everything animates via useFrame sine
 * paths only — no colliders, no shadows (castShadow off per the task),
 * kept purely decorative so it can never interfere with Player/puzzle
 * logic.
 *
 * The procedural plane-wing `Butterfly` component below is no longer
 * rendered — butterflies now come from the real GLB model in
 * GlbButterfly.tsx (see GameEnvironment.tsx). The component/types here are
 * kept in the file (unused) rather than deleted, per instruction, in case
 * they're needed again as a fallback.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Butterflies ────────────────────────────────────────────────────────────
interface ButterflyDef {
  center: [number, number];
  baseHeight: number;
  radius: number;
  speed: number;
  phase: number;
  color: string;
  flapSpeed: number;
}

function Butterfly({ def }: { def: ButterflyDef }) {
  const group = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * def.speed + def.phase;
    const g = group.current;
    if (g) {
      g.position.set(
        def.center[0] + Math.cos(t) * def.radius,
        def.baseHeight + Math.sin(t * 2.3) * 0.18,
        def.center[1] + Math.sin(t) * def.radius,
      );
      g.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(state.clock.elapsedTime * def.flapSpeed + def.phase) * 0.9 + 0.9;
    if (wingL.current) wingL.current.rotation.y = flap;
    if (wingR.current) wingR.current.rotation.y = -flap;
  });

  return (
    <group ref={group} castShadow={false}>
      <mesh ref={wingL} position={[0.06, 0, 0]} castShadow={false}>
        <planeGeometry args={[0.22, 0.16]} />
        <meshStandardMaterial
          color={def.color}
          side={THREE.DoubleSide}
          emissive={def.color}
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={wingR} position={[-0.06, 0, 0]} castShadow={false}>
        <planeGeometry args={[0.22, 0.16]} />
        <meshStandardMaterial
          color={def.color}
          side={THREE.DoubleSide}
          emissive={def.color}
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ─── Birds ──────────────────────────────────────────────────────────────────
interface BirdDef {
  center: [number, number];
  height: number;
  radius: number;
  speed: number;
  phase: number;
}

function Bird({ def }: { def: BirdDef }) {
  const group = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime * def.speed + def.phase;
    const g = group.current;
    if (g) {
      g.position.set(
        def.center[0] + Math.cos(t) * def.radius,
        def.height,
        def.center[1] + Math.sin(t) * def.radius,
      );
      g.rotation.y = -t + Math.PI / 2;
    }
    const flap = Math.sin(state.clock.elapsedTime * 3 + def.phase) * 0.5;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });

  return (
    <group ref={group} castShadow={false}>
      <mesh castShadow={false}>
        <coneGeometry args={[0.08, 0.35, 4]} />
        <meshBasicMaterial color="#1c1c22" />
      </mesh>
      <mesh ref={wingL} position={[0.15, 0, 0]} rotation={[0, 0, 0.2]} castShadow={false}>
        <planeGeometry args={[0.32, 0.06]} />
        <meshBasicMaterial color="#1c1c22" side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={wingR} position={[-0.15, 0, 0]} rotation={[0, 0, -0.2]} castShadow={false}>
        <planeGeometry args={[0.32, 0.06]} />
        <meshBasicMaterial color="#1c1c22" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export interface WildlifeProps {
  flowerCenters: [number, number][];
  templePosition: [number, number, number];
}

const BUTTERFLY_COLORS = ["#f97373", "#fbbf24", "#a78bfa", "#38bdf8", "#f472b6"];

export default function Wildlife({ flowerCenters, templePosition }: WildlifeProps) {
  const butterflies = useMemo<ButterflyDef[]>(() => {
    const count = 6;
    const defs: ButterflyDef[] = [];
    for (let i = 0; i < count; i++) {
      const anchor = flowerCenters.length
        ? flowerCenters[Math.floor((i / count) * flowerCenters.length)]
        : [0, -10];
      defs.push({
        center: anchor as [number, number],
        baseHeight: 0.6 + Math.random() * 0.9,
        radius: 1.2 + Math.random() * 1.2,
        speed: 0.35 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length],
        flapSpeed: 8 + Math.random() * 4,
      });
    }
    return defs;
  }, [flowerCenters]);

  const birds = useMemo<BirdDef[]>(() => {
    const count = 3;
    const defs: BirdDef[] = [];
    for (let i = 0; i < count; i++) {
      defs.push({
        center: [templePosition[0], templePosition[2]],
        height: 15 + Math.random() * 10,
        radius: 10 + i * 4,
        speed: 0.08 + Math.random() * 0.06,
        phase: (i / count) * Math.PI * 2,
      });
    }
    return defs;
  }, [templePosition]);

  return (
    <>
      {birds.map((def, i) => (
        <Bird key={`bird-${i}`} def={def} />
      ))}
    </>
  );
}
