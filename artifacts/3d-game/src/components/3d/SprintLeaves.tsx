/**
 * SprintLeaves
 *
 * Replaces SprintAura (glow sprite + point lights) entirely. Spawns
 * exactly 10 small leaves — alternating between low_poly_leaves.glb's two
 * distinct leaf shapes for variety — that flutter in a loose spiral/orbit
 * around the character's arm/leg area while sprinting. Sibling to
 * <Player/> inside <Canvas> (mounted in Scene.tsx), same PLAYER_WORLD_POS-
 * follow + damped fade (THREE.MathUtils.damp) pattern SprintAura used —
 * only what's being animated changed, not the fade mechanics.
 *
 * Each leaf is a plain per-frame-updated mesh (not InstancedMesh) — with
 * only 10 total, the draw-call savings from instancing are negligible,
 * and per-leaf independent orbit motion is simpler to reason about this
 * way than juggling per-instance matrices.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { PLAYER_WORLD_POS, PlayerControl } from "./Player";

const MODEL_PATH = "/models/low_poly_leaves.glb";
// The GLB's two distinct leaf shapes (node names, confirmed via direct GLB
// inspection) — static props, no skin/animation, safe to reuse directly.
const LEAF_NODE_NAMES = ["Object_2", "Object_3"];
const LEAF_COUNT = 10;
const FADE_LAMBDA = 6; // same damped-ramp rate SprintAura used
const MAX_OPACITY = 0.9;

// A single leaf's raw longest dimension (Y-extent, ~2.69 units — measured
// directly from the GLB's accessor bounds) scaled down to a small,
// delicate on-screen size, not large debris.
const RAW_LEAF_SIZE = 2.69;
const TARGET_LEAF_SIZE = 0.09;
const LEAF_SCALE = TARGET_LEAF_SIZE / RAW_LEAF_SIZE;

interface LeafDef {
  radius: number;
  heightOffset: number;
  angularSpeed: number;
  phase: number;
  bobAmp: number;
  bobSpeed: number;
  bobPhase: number;
  spinSpeed: number;
  sourceIndex: number;
}

function makeLeafDefs(): LeafDef[] {
  const defs: LeafDef[] = [];
  for (let i = 0; i < LEAF_COUNT; i++) {
    defs.push({
      radius: 0.16 + Math.random() * 0.2, // close around the body, not far out
      heightOffset: 0.05 + Math.random() * 0.5, // spans leg-to-arm height
      angularSpeed: 1.2 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      bobAmp: 0.03 + Math.random() * 0.03,
      bobSpeed: 1.5 + Math.random() * 1.2,
      bobPhase: Math.random() * Math.PI * 2,
      spinSpeed: 2 + Math.random() * 3,
      sourceIndex: i % LEAF_NODE_NAMES.length,
    });
  }
  return defs;
}

export default function SprintLeaves() {
  const { nodes } = useGLTF(MODEL_PATH) as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  // Each leaf shape paired with its own material (read directly off the
  // node, so geometry/material can never mismatch), cloned + forced
  // transparent so opacity can be animated for the fade.
  const leafSources = useMemo(() => {
    return LEAF_NODE_NAMES.map((name) => nodes[name])
      .filter((n): n is THREE.Mesh => !!n)
      .map((n) => {
        const sourceMat = Array.isArray(n.material) ? n.material[0] : n.material;
        const material = sourceMat.clone();
        material.transparent = true;
        material.opacity = 0;
        return { geometry: n.geometry, material };
      });
  }, [nodes]);

  const defs = useMemo(makeLeafDefs, []);

  const groupRef = useRef<THREE.Group>(null);
  const leafRefs = useRef<(THREE.Group | null)[]>([]);
  const intensity = useRef(0);
  const [, getKeys] = useKeyboardControls<PlayerControl>();

  useFrame((state, delta) => {
    const { forward, backward, left, right, sprint } = getKeys();
    const moving = forward || backward || left || right;
    const target = sprint && moving ? 1 : 0;
    intensity.current = THREE.MathUtils.damp(intensity.current, target, FADE_LAMBDA, delta);
    const t = intensity.current;

    groupRef.current?.position.copy(PLAYER_WORLD_POS);
    leafSources.forEach(({ material }) => {
      material.opacity = t * MAX_OPACITY;
    });

    if (t < 0.01) return; // skip motion math while fully faded out

    const time = state.clock.elapsedTime;
    defs.forEach((def, i) => {
      const leaf = leafRefs.current[i];
      if (!leaf) return;
      const angle = time * def.angularSpeed + def.phase;
      leaf.position.set(
        Math.cos(angle) * def.radius,
        def.heightOffset + Math.sin(time * def.bobSpeed + def.bobPhase) * def.bobAmp,
        Math.sin(angle) * def.radius,
      );
      leaf.rotation.y = time * def.spinSpeed;
      leaf.rotation.x = Math.sin(time * def.bobSpeed + def.bobPhase) * 0.3;
    });
  });

  if (leafSources.length === 0) return null;

  return (
    <group ref={groupRef}>
      {defs.map((def, i) => {
        const source = leafSources[def.sourceIndex % leafSources.length];
        return (
          <group
            key={i}
            ref={(el) => {
              leafRefs.current[i] = el;
            }}
            scale={LEAF_SCALE}
          >
            <mesh geometry={source.geometry} material={source.material} />
          </group>
        );
      })}
    </group>
  );
}

// Deliberately NOT eagerly preloaded — see Player.tsx's identical note.
// Only fetches once SprintLeaves actually mounts during gameplay.
