/**
 * SpeakingAvatar
 *
 * Small portrait of a dedicated storytelling character, fixed bottom-right,
 * shown only while IntroStory is mounted. Loads its own model
 * (introcharacter.glb) — fully decoupled from final_player3.glb, the
 * gameplay character Player.tsx renders. That separation matters: an
 * earlier diagnostic version of this file dropped the `.clone()` on
 * final_player3.glb's shared GLTF-cache scene and attached the live object
 * directly, which briefly caused the *gameplay* character to fail to
 * render (two separate R3F Canvas roots — this one during the intro,
 * Player.tsx's during gameplay — fighting over the same live THREE.Object3D,
 * which can only have one parent at a time). Using a completely separate
 * model file for this component removes that risk structurally rather than
 * relying on remembering to clone correctly.
 *
 * ── GLB inspection result (introcharacter.glb) ──────────────────────────
 * Parsed the GLB's glTF JSON directly: no `skins`, no `animations`, no
 * morph `targets` on its single mesh primitive (attributes are only
 * POSITION/NORMAL/TEXCOORD_0 — no JOINTS_0/WEIGHTS_0, so it isn't even
 * skinned). It's a static, unrigged, unlit single-mesh bust. So real
 * lip-sync is impossible here — instead, "talking" is a substitute
 * whole-mesh scale-pulse + slight vertical bob (see TalkingBob below),
 * layered alongside the existing frame glow-pulse, not replacing it.
 *
 * Framing: no skeleton to derive a "head" position from, so the camera is
 * framed from the model's own measured bounding SPHERE (covers the whole
 * box regardless of viewing angle/orientation, unlike using just one axis)
 * with a proper FOV-based fit-distance calculation — not an eyeballed
 * multiplier, which is why the previous version clipped at the frame
 * edges (its distance was *closer* than the actual fit distance for that
 * FOV). FRAME_FILL_FACTOR<1 leaves a margin so the bust doesn't touch the
 * circular mask edge.
 */
import { Suspense, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { getCurrentSpeechText, subscribeSpeech } from "../../audio/voice";

const MODEL_URL = "/models/introcharacter.glb";
const CAMERA_FOV = 35;
// Fit the bust within this fraction of the frame (85-90% requested) so
// nothing touches the circular mask edge.
const FRAME_FILL_FACTOR = 0.87;

// Talking-bob substitute for lip-sync (no bones/morph targets available —
// see file header). Scale oscillates between 1.0 and 1+SCALE_AMPLITUDE
// (never below 1.0, per spec); the vertical bob is symmetric around rest.
const TALK_RATE = 9; // rad/s — one full cycle roughly every ~0.7s
const SCALE_AMPLITUDE = 0.028;
const BOB_FADE_LAMBDA = 6; // same damped-ramp pattern as SprintAura's fade

function getServerSnapshot(): string | null {
  return null;
}

interface Framing {
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Bounding-sphere radius — reused to scale the talking bob's vertical
   * motion to whatever size this model actually turns out to be. */
  radius: number;
}

/** Frames the camera from the model's own bounding sphere — no bone-name
 * or facing-direction assumptions (this mesh has no skeleton at all), and
 * a proper trig-based fit distance instead of an eyeballed multiplier. */
function computeFraming(root: THREE.Object3D): Framing {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius || 1;

  // Distance at which the bounding sphere exactly fills the vertical FOV,
  // then pulled back further by FRAME_FILL_FACTOR so it only fills that
  // fraction of the frame instead of touching the edge.
  const halfFovRad = THREE.MathUtils.degToRad(CAMERA_FOV / 2);
  const fitDistance = radius / (Math.sin(halfFovRad) * FRAME_FILL_FACTOR);

  const position = sphere.center
    .clone()
    .add(new THREE.Vector3(0, radius * 0.08, fitDistance));

  return { position, target: sphere.center, radius };
}

function PortraitCamera({ framing }: { framing: Framing }) {
  return (
    <PerspectiveCamera
      makeDefault
      fov={CAMERA_FOV}
      near={0.05}
      far={50}
      position={framing.position}
      onUpdate={(cam) => cam.lookAt(framing.target)}
    />
  );
}

/** Whole-mesh scale-pulse + slight vertical bob while speech is active,
 * damped smoothly in/out (not a snap) exactly like SprintAura's intensity
 * ramp. Wraps the model in its own group so this never touches the
 * camera-framing group's own transform. */
function TalkingBob({
  radius,
  isSpeaking,
  children,
}: {
  radius: number;
  isSpeaking: boolean;
  children: ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const intensity = useRef(0);
  const bobAmplitude = radius * 0.03;

  useFrame((state, delta) => {
    intensity.current = THREE.MathUtils.damp(
      intensity.current,
      isSpeaking ? 1 : 0,
      BOB_FADE_LAMBDA,
      delta,
    );
    const t = state.clock.elapsedTime;
    const signedWave = Math.sin(t * TALK_RATE);
    const scaleWave01 = signedWave * 0.5 + 0.5; // remapped to [0,1] so scale never dips below 1.0

    const group = groupRef.current;
    if (!group) return;
    group.scale.setScalar(1 + scaleWave01 * intensity.current * SCALE_AMPLITUDE);
    group.position.y = signedWave * intensity.current * bobAmplitude;
  });

  return <group ref={groupRef}>{children}</group>;
}

function PortraitModel({ isSpeaking }: { isSpeaking: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  // Cheap insurance against the exact class of bug described in the file
  // header — this model currently has only one consumer, but cloning costs
  // nothing and means that stays true by construction, not by convention.
  const cloned = useMemo(() => scene.clone(), [scene]);
  const framing = useMemo(() => computeFraming(cloned), [cloned]);

  return (
    <group dispose={null}>
      <TalkingBob radius={framing.radius} isSpeaking={isSpeaking}>
        <primitive object={cloned} />
      </TalkingBob>
      <PortraitCamera framing={framing} />
      <hemisphereLight args={["#fff4d6", "#1a1030", 1.2]} />
      <directionalLight position={[0.6, 1, 1]} intensity={1.3} color="#ffd9a0" />
    </group>
  );
}

export default function SpeakingAvatar() {
  const currentText = useSyncExternalStore(
    subscribeSpeech,
    getCurrentSpeechText,
    getServerSnapshot,
  );
  const isSpeaking = currentText !== null;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-[110] sm:bottom-6 sm:right-6">
      {/* Pulsing ring — only animates while she's actually speaking */}
      <div
        className={[
          "absolute -inset-1.5 rounded-full border-2 border-amber-300/70 transition-opacity duration-300",
          isSpeaking ? "animate-ping opacity-100" : "opacity-0",
        ].join(" ")}
      />

      <div
        className={[
          "h-[120px] w-[120px] overflow-hidden rounded-full border-2 bg-gradient-to-b from-stone-900 to-emerald-950 transition-all duration-300 sm:h-[150px] sm:w-[150px]",
          isSpeaking
            ? "border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.85)]"
            : "border-amber-700/70 shadow-[0_0_14px_rgba(217,119,6,0.35)]",
        ].join(" ")}
      >
        <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
          <Suspense fallback={null}>
            <PortraitModel isSpeaking={isSpeaking} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
