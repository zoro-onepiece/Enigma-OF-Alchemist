import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, PositionalAudio } from "@react-three/drei";
import * as THREE from "three";
import { PLAYER_WORLD_POS } from "../../3d/Player";
import { audioFileExists } from "../../../audio/sounds";
import { speak, canTrigger } from "../../../audio/voice";
import { useSoundStore } from "../../../store/soundStore";
import { useGameStore } from "../../../store/gameStore";
import { registerBlocker } from "../../../lib/worldCollision";
import SparkleFountain from "../effects/SparkleFountain";

const HUM_PATH = "/audio/hum.mp3";

/** Defense in depth: even after the existence+content-type check in
 * audioFileExists(), a genuinely corrupt/unsupported audio file could still
 * fail to decode inside drei's <PositionalAudio> (which throws inside
 * Suspense). Without a boundary that error propagates all the way up and
 * takes down the whole <Canvas>. This swallows it and just drops the hum —
 * silence, not a crash. */
class AudioErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Renders drei's <PositionalAudio> only once we've confirmed hum.mp3
 * actually exists — avoids a console 404/decode error before the user has
 * uploaded it (this file is optional; the task only requires music/
 * footstep/chime/victory/click). */
function PuzzleHum({ muted }: { muted: boolean }) {
  const [available, setAvailable] = useState(false);
  const audioRef = useRef<THREE.PositionalAudio>(null);

  useEffect(() => {
    let cancelled = false;
    audioFileExists(HUM_PATH).then((ok) => {
      if (!cancelled) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // drei's <PositionalAudio> doesn't expose a `volume` prop; set it
  // imperatively on the underlying THREE.PositionalAudio instance instead,
  // and keep it in sync with the mute toggle.
  useEffect(() => {
    audioRef.current?.setVolume(muted ? 0 : 0.18);
  }, [muted, available]);

  if (!available) return null;
  return <PositionalAudio ref={audioRef} url={HUM_PATH} distance={4} loop autoplay />;
}

/**
 * GlowingPuzzle
 *
 * Visual: a dark stone octagon base with a floating, glowing rune ring
 * hovering above it (bobbing + slow rotation while unsolved). Interaction
 * contract intentionally mirrors PuzzleObject.tsx (id/position/onActivate/
 * solved + hover tooltip) so this reuses the game's existing click/interact
 * pattern instead of inventing a new one — GameEnvironment wires `onActivate`
 * and `isSolved` straight to the gameStore's openPuzzle action / puzzle.solved
 * set, same as PuzzleObject would.
 *
 * Proximity + "Press E": each instance tracks its own distance to
 * PLAYER_WORLD_POS every frame and registers itself in a small
 * module-scoped registry (not React/Zustand state — this is purely a
 * same-file coordination mechanism, so it doesn't violate the "extend
 * gameStore.ts only" constraint). A single shared `keydown` listener reads
 * that registry to find the *nearest* unsolved puzzle currently in range
 * and activates only that one, so standing between two puzzles doesn't
 * double-trigger them.
 */
export interface GlowingPuzzleProps {
  id: string;
  position: [number, number, number];
  color?: string;
  isSolved?: boolean;
  onActivate?: (id: string) => void;
}

// Exported for MinimapOverlay.tsx (Task D) so its pedestal dots reuse the
// exact same solved/unsolved colors these pedestals actually render with.
export const SOLVED_COLOR = "#facc15";
export const DEFAULT_PUZZLE_COLOR = "#a78bfa";
const PROXIMITY_RANGE = 3.5;
// Matches the stone base's actual visual footprint (cylinderGeometry
// args={[0.65, 0.75, 0.3, 8]} below — 0.75 is the wider bottom radius, used
// here so the collider covers the full visible base rather than
// under-covering it). No collider was registered for pedestals at all
// before this — confirmed via a repo-wide grep for registerBlocker(),
// which only turned up the various tree components and JapaneseTemple —
// that's the actual root cause of walking straight through them, not a
// mismatched position/radius.
const PEDESTAL_COLLIDER_RADIUS = 0.75;

interface ProximityEntry {
  distance: number;
  solved: boolean;
  activate: () => void;
}

const proximityRegistry = new Map<string, ProximityEntry>();
let globalKeyListenerAttached = false;

// Generic-but-flavorful hint line — puzzles can be solved in any order, so
// this deliberately avoids naming a specific mini-game/theme. A single
// shared cooldown key (not per-puzzle) keeps a quick run past several
// pedestals from queueing up a pile of hint lines back to back.
//
// Uses speak() (live speechSynthesis) — the same story-narrator voice
// IntroStory.tsx's paragraphs use — not playVoiceLine()'s pre-recorded
// character MP3s. This line reads as the world/shrine narrator describing
// the shrine, not the player character speaking, so it belongs on the
// narrator voice, not the character voice bank.
const APPROACH_HINT_TEXT =
  "This shrine holds one of the four seals. Solve its trial to claim a fragment of the old power.";
const APPROACH_HINT_COOLDOWN_MS = 20000;

function speakApproachHint(): void {
  if (!canTrigger("puzzle-approach-hint", APPROACH_HINT_COOLDOWN_MS)) return;
  speak(APPROACH_HINT_TEXT, { priority: true });
}

function ensureGlobalKeyListener() {
  if (globalKeyListenerAttached) return;
  globalKeyListenerAttached = true;
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "e") return;
    if (useGameStore.getState().phase === "dead") return;
    let nearest: ProximityEntry | null = null;
    for (const entry of proximityRegistry.values()) {
      if (entry.solved) continue;
      if (entry.distance > PROXIMITY_RANGE) continue;
      if (!nearest || entry.distance < nearest.distance) nearest = entry;
    }
    nearest?.activate();
  });
}

export default function GlowingPuzzle({
  id,
  position,
  color = DEFAULT_PUZZLE_COLOR,
  isSolved = false,
  onActivate,
}: GlowingPuzzleProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [inRange, setInRange] = useState(false);
  const activeColor = isSolved ? SOLVED_COLOR : color;
  const puzzlePos = useRef(new THREE.Vector3(...position));
  const soundMuted = useSoundStore((s) => s.muted);

  const activate = () => !isSolved && onActivate?.(id);

  // Block movement through the pedestal's stone base — solved or not, it's
  // always physically solid, so no isSolid() gating needed (unlike a future
  // door-style blocker). Same registerBlocker() pattern the tree components
  // and JapaneseTemple already use.
  useEffect(() => {
    return registerBlocker({
      minX: position[0] - PEDESTAL_COLLIDER_RADIUS,
      maxX: position[0] + PEDESTAL_COLLIDER_RADIUS,
      minZ: position[2] - PEDESTAL_COLLIDER_RADIUS,
      maxZ: position[2] + PEDESTAL_COLLIDER_RADIUS,
      isSolid: () => true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[2]]);

  // Keep the shared proximity registry in sync with this instance's latest
  // solved flag / activate handler even when they change between renders.
  useEffect(() => {
    ensureGlobalKeyListener();
    return () => {
      proximityRegistry.delete(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFrame((state) => {
    const ring = ringRef.current;
    if (ring) {
      ring.rotation.z += 0.006;
      ring.position.y = isSolved
        ? 0.9
        : 0.9 + Math.sin(state.clock.elapsedTime * 1.8) * 0.12;
    }

    // Mutate the existing registry entry in place rather than allocating a
    // new object every frame (this useFrame runs 60x/sec per pedestal,
    // times 4 pedestals — a steady stream of small garbage otherwise).
    // Only the very first frame for a given id allocates.
    const distance = PLAYER_WORLD_POS.distanceTo(puzzlePos.current);
    const entry = proximityRegistry.get(id);
    if (entry) {
      entry.distance = distance;
      entry.solved = isSolved;
      entry.activate = activate;
    } else {
      proximityRegistry.set(id, { distance, solved: isSolved, activate });
    }

    const nowInRange = !isSolved && distance <= PROXIMITY_RANGE;
    if (nowInRange !== inRange) {
      setInRange(nowInRange);
      if (nowInRange) speakApproachHint();
    }
  });

  return (
    <group position={position}>
      {/* Base — dark stone octagon */}
      <mesh position={[0, 0.15, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.65, 0.75, 0.3, 8]} />
        <meshStandardMaterial color="#2b2733" roughness={0.85} />
      </mesh>

      {/* Glowing rune ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.9, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={() => activate()}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <ringGeometry args={[0.32, 0.5, 6]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={isSolved ? 1.4 : 2}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Soft magical hum while unsolved — stops as soon as the puzzle is
          solved since this whole block only mounts when !isSolved. */}
      {!isSolved && (
        <AudioErrorBoundary>
          <PuzzleHum muted={soundMuted} />
        </AudioErrorBoundary>
      )}

      {/* Gentle golden sparkle fountain rising from a solved pedestal. */}
      {isSolved && (
        <group position={[0, 0.3, 0]}>
          <SparkleFountain count={70} radius={0.4} height={1.6} />
        </group>
      )}

      {(hovered || inRange) && !isSolved && (
        <Html center distanceFactor={6} position={[0, 1.5, 0]}>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
            Press E to interact
          </div>
        </Html>
      )}

      <pointLight position={[0, 0.9, 0]} color={activeColor} intensity={1} distance={4} />
    </group>
  );
}
