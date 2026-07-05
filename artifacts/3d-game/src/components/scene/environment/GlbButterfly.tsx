/**
 * GlbButterfly
 *
 * GLB-based butterflies replacing the old procedural plane-wing butterflies
 * from Wildlife.tsx. Loads the user-provided "butterfly.glb" (a single
 * merged mesh, no separate wing sub-meshes, no baked animation clips — see
 * useAnimations check below) and scatters many small instances across the
 * island's flower patches using drei <Clone> so the GLB's geometry/material
 * is only loaded once and shared across every instance.
 *
 * Animation strategy (per spec priority order):
 *   1. If the GLB ships animation clips, play them via useAnimations with a
 *      per-instance timeScale so butterflies don't flap in lockstep.
 *   2. Else if wing meshes are identifiable by name, oscillate them
 *      directly (not applicable to this asset — it's one fused mesh).
 *   3. Else (this asset's case): fall back to a subtle whole-body flutter —
 *      a fast local vertical bob + gentle roll, distinct from the slower
 *      large-scale wandering flight path below, each with its own
 *      per-instance frequency/phase so instances desync visually.
 *
 * Flight: each butterfly wanders around an anchor flower-cluster center
 * using layered sine drift on x/z (two frequencies per axis so the path
 * isn't a perfect circle) plus a slow vertical bob, staying within the
 * requested 0.5-2 unit height band. The group always faces its instantaneous
 * movement direction (computed via a tiny finite-difference lookahead).
 *
 * castShadow left off (drei <Clone> defaults to false) — purely decorative,
 * matches how the old procedural butterflies and other small ambient life
 * behave in this scene.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, Clone } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/butterfly.glb";

// Requested wingspan range is 0.15-0.3 world units (hand-sized relative to
// the character); target the midpoint and let per-instance scaleJitter
// spread instances across the full range.
const TARGET_WINGSPAN = 0.22;

interface ButterflyDef {
  center: [number, number];
  baseHeight: number;
  radiusX: number;
  radiusZ: number;
  driftX: number;
  driftZ: number;
  driftFreqX: number;
  driftFreqZ: number;
  speed: number;
  phase: number;
  phase2: number;
  phase3: number;
  bobAmp: number;
  bobSpeed: number;
  bobPhase: number;
  flapSpeed: number;
  flapPhase: number;
  scaleJitter: number;
}

function GlbButterflyInstance({
  scene,
  animationClip,
  scaleFactor,
  def,
}: {
  scene: THREE.Object3D;
  animationClip: THREE.AnimationClip | null;
  scaleFactor: number;
  def: ButterflyDef;
}) {
  const group = useRef<THREE.Group>(null);
  const flutter = useRef<THREE.Group>(null);
  const cloneRoot = useRef<THREE.Group>(null);

  const { actions } = useAnimations(
    animationClip ? [animationClip] : [],
    cloneRoot,
  );

  // Branch 1: play the GLB's own animation (if any) with a per-instance
  // speed so every butterfly is out of sync.
  useEffect(() => {
    if (!animationClip) return;
    const action = actions[animationClip.name];
    if (!action) return;
    action.reset().play();
    action.timeScale = def.flapSpeed;
    return () => {
      action.stop();
    };
  }, [actions, animationClip, def.flapSpeed]);

  const flightPos = (t: number) => {
    const ft = t * def.speed + def.phase;
    const x =
      def.center[0] +
      Math.sin(ft) * def.radiusX +
      Math.sin(ft * def.driftFreqX + def.phase2) * def.driftX;
    const z =
      def.center[1] +
      Math.cos(ft * 0.85 + def.phase3) * def.radiusZ +
      Math.cos(ft * def.driftFreqZ) * def.driftZ;
    const y = def.baseHeight + Math.sin(t * def.bobSpeed + def.bobPhase) * def.bobAmp;
    return { x, y, z };
  };

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const g = group.current;
    if (!g) return;

    const { x, y, z } = flightPos(t);
    const ahead = flightPos(t + 0.05);
    const dx = ahead.x - x;
    const dz = ahead.z - z;

    g.position.set(x, y, z);
    if (Math.abs(dx) > 1e-5 || Math.abs(dz) > 1e-5) {
      g.rotation.y = Math.atan2(dx, dz);
    }

    // Branch 3 fallback: no separable wing meshes on this GLB (single
    // fused mesh, confirmed via inspection), and no baked animation clip,
    // so simulate a subtle whole-body flutter distinct from the slow
    // wandering flight above.
    if (!animationClip && flutter.current) {
      const flap = Math.sin(t * def.flapSpeed + def.flapPhase);
      flutter.current.position.y = flap * 0.015;
      flutter.current.rotation.z = flap * 0.14;
      flutter.current.rotation.x = flap * 0.06;
    }
  });

  return (
    <group ref={group} castShadow={false}>
      <group ref={flutter} scale={scaleFactor * def.scaleJitter}>
        <group ref={cloneRoot}>
          <Clone object={scene} />
        </group>
      </group>
    </group>
  );
}

export interface GlbButterfliesProps {
  flowerCenters: [number, number][];
  count?: number;
}

export default function GlbButterflies({
  flowerCenters,
  count = 15,
}: GlbButterfliesProps) {
  const { scene, animations } = useGLTF(MODEL_PATH);

  // Measure the GLB's own bounding box so the scale factor is computed from
  // the real asset instead of a guessed constant.
  const scaleFactor = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const wingspan = Math.max(size.x, size.z) || 1;
    return TARGET_WINGSPAN / wingspan;
  }, [scene]);

  const animationClip = animations.length > 0 ? animations[0] : null;

  const defs = useMemo<ButterflyDef[]>(() => {
    const anchors = flowerCenters.length ? flowerCenters : ([[0, -10]] as [number, number][]);
    const list: ButterflyDef[] = [];
    for (let i = 0; i < count; i++) {
      const anchor = anchors[i % anchors.length];
      list.push({
        center: anchor,
        baseHeight: 0.5 + Math.random() * 1.5,
        radiusX: 0.7 + Math.random() * 1.3,
        radiusZ: 0.7 + Math.random() * 1.3,
        driftX: 0.25 + Math.random() * 0.45,
        driftZ: 0.25 + Math.random() * 0.45,
        driftFreqX: 0.4 + Math.random() * 0.4,
        driftFreqZ: 0.3 + Math.random() * 0.4,
        speed: 0.2 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        phase2: Math.random() * Math.PI * 2,
        phase3: Math.random() * Math.PI * 2,
        bobAmp: 0.12 + Math.random() * 0.1,
        bobSpeed: 0.5 + Math.random() * 0.4,
        bobPhase: Math.random() * Math.PI * 2,
        flapSpeed: 7 + Math.random() * 4,
        flapPhase: Math.random() * Math.PI * 2,
        scaleJitter: 0.8 + Math.random() * 0.4,
      });
    }
    return list;
  }, [flowerCenters, count]);

  if (!scene) return null;

  return (
    <>
      {defs.map((def, i) => (
        <GlbButterflyInstance
          key={`glb-butterfly-${i}`}
          scene={scene}
          animationClip={animationClip}
          scaleFactor={scaleFactor}
          def={def}
        />
      ))}
    </>
  );
}

useGLTF.preload(MODEL_PATH);
