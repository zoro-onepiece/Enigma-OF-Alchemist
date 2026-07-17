/**
 * SprintAura
 *
 * Sibling to <Player /> inside <Canvas> (mounted in Scene.tsx) — reads the
 * same sprint+moving boolean SprintFootstepSound reads via
 * useKeyboardControls, and Player.tsx's existing shared PLAYER_WORLD_POS
 * tracker to follow the character each frame. Does not touch Player.tsx's
 * own movement/animation state machine or mesh setup.
 *
 * Visual: a soft radiant halo, not the earlier inverted-hull rim/outline
 * (that read as "her silhouette has a glowing edge" rather than "she's
 * glowing"). Two parts:
 *   1. A vertical additive billboard sprite — THREE.Sprite always faces
 *      the camera automatically, no per-frame orientation math needed —
 *      using a procedurally generated radial-gradient CanvasTexture (no
 *      image asset required), centered on the character and extending
 *      slightly above/around them.
 *   2. Two neon pink-purple point lights (same reasoning GlowingPuzzle.tsx
 *      uses for its solved-pedestal glow — colored pointLight, no extra
 *      geometry) — one near the character's mid-body, one low near the
 *      ground, so the glow visibly lights up nearby ground/objects, not
 *      just the sprite itself.
 * Both ramp through the same damped fade (THREE.MathUtils.damp) as the
 * previous implementation — instant on/off replaced by a smooth ramp.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import { PLAYER_WORLD_POS, PlayerControl } from "./Player";

const FADE_LAMBDA = 6; // higher = snappier fade (THREE.MathUtils.damp rate)
const MAX_SPRITE_OPACITY = 0.85;
const MAX_LIGHT_INTENSITY = 2.2;
// Neon pink-purple — tighter/closer to the body than the original gold
// version (~35% smaller on both axes).
const AURA_COLOR = "#e040fb";
// Edge color baked directly into the gradient stops below as rgba(192,38,212,*)
// — that's #c026d3, the darker violet end of the pink-purple range.
const SPRITE_WIDTH = 0.7;
// Y-axis reduced a further ~45% from 1.1 (the earlier uniform-scale-down
// value) — width/color unchanged from that pass, this is height-only.
const SPRITE_HEIGHT = 0.6;
const SPRITE_Y_OFFSET = 0.55; // lifts the sprite's center to roughly torso height

let cachedGlowTexture: THREE.CanvasTexture | null = null;

/** A soft neon pink-purple radial gradient, generated once and reused — no
 * external image asset needed. White-hot center fading through magenta/
 * violet to transparent, so the additive-blended sprite reads as a gentle
 * glow, not a hard disc. */
function getGlowTexture(): THREE.CanvasTexture {
  if (cachedGlowTexture) return cachedGlowTexture;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(224,64,251,0.55)");
  gradient.addColorStop(1, "rgba(192,38,212,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  cachedGlowTexture = texture;
  return texture;
}

export default function SprintAura() {
  const glowTexture = useMemo(() => getGlowTexture(), []);

  const groupRef = useRef<THREE.Group>(null);
  const spriteMaterialRef = useRef<THREE.SpriteMaterial>(null);
  const midLightRef = useRef<THREE.PointLight>(null);
  const groundLightRef = useRef<THREE.PointLight>(null);
  const intensity = useRef(0);
  const [, getKeys] = useKeyboardControls<PlayerControl>();

  useFrame((_, delta) => {
    const { forward, backward, left, right, sprint } = getKeys();
    const moving = forward || backward || left || right;
    const target = sprint && moving ? 1 : 0;
    intensity.current = THREE.MathUtils.damp(intensity.current, target, FADE_LAMBDA, delta);
    const t = intensity.current;

    groupRef.current?.position.copy(PLAYER_WORLD_POS);
    if (spriteMaterialRef.current) spriteMaterialRef.current.opacity = t * MAX_SPRITE_OPACITY;
    if (midLightRef.current) midLightRef.current.intensity = t * MAX_LIGHT_INTENSITY;
    if (groundLightRef.current) groundLightRef.current.intensity = t * MAX_LIGHT_INTENSITY * 0.8;
  });

  return (
    <group ref={groupRef}>
      <sprite position={[0, SPRITE_Y_OFFSET, 0]} scale={[SPRITE_WIDTH, SPRITE_HEIGHT, 1]}>
        <spriteMaterial
          ref={spriteMaterialRef}
          map={glowTexture}
          color={AURA_COLOR}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>

      {/* Mid-body glow — lights the character herself. */}
      <pointLight
        ref={midLightRef}
        color={AURA_COLOR}
        intensity={0}
        distance={3}
        position={[0, 0.5, 0]}
      />
      {/* Low, wide-reaching glow — casts neon pink-purple light onto the
          ground and nearby objects, not just the character. */}
      <pointLight
        ref={groundLightRef}
        color={AURA_COLOR}
        intensity={0}
        distance={4.5}
        position={[0, 0.05, 0]}
      />
    </group>
  );
}
