import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Sky,
  Clouds,
  Cloud,
  Stats,
  KeyboardControls,
} from "@react-three/drei";
import * as THREE from "three";
import Lighting, { SUN_POSITION } from "./Lighting";
import GameEnvironment from "./environment/GameEnvironment";
import Player, { playerKeyboardMap, teleportPlayerToSpawn } from "../3d/Player";
import SprintLeaves from "../3d/SprintLeaves";
import Merchant from "../3d/Merchant"; // <--- YAHAN IMPORT ADD KAREIN
import GameHUD from "../hud/GameHUD";
import AudioMuteToggle from "../hud/AudioMuteToggle";
import FinaleOverlay from "../hud/FinaleOverlay";
import MobileControls from "../hud/MobileControls";
import MinimapOverlay from "../hud/MinimapOverlay";
import PuzzleModal from "../puzzles/PuzzleModal";
import SprintFootstepSound from "../story/SprintFootstepSound";
import IdleReminder from "../story/IdleReminder";
import GameOverOverlay from "../story/GameOverOverlay";
import { useGameStore } from "../../store/gameStore";
import { ISLAND_SCALE } from "../../lib/worldCollision";
import { initMusicOnFirstInteraction, playSfx } from "../../audio/sounds";
import { playVoiceLine, canTrigger } from "../../audio/voice";
import SubtitleBar from "../story/SubtitleBar";
import { useShowTouchControls } from "../../hooks/use-mobile";

// Shared daytime sky color — used for the scene background, fog, and (via
// Lighting.tsx's SUN_POSITION export) kept visually consistent with the sun
// direction so the directional shadow light matches what <Sky> renders.
const SKY_COLOR = "#87ceeb";

// ─── WebGL capability check ───────────────────────────────────────────────────
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Note: the Fortnite-style camera (OrbitControls + follow + target-locking)
// lives entirely inside Player.tsx, since it needs the player's group ref
// and movement math every frame. Nothing camera-related is declared here.
// Player.tsx is intentionally left untouched by this environment rewrite —
// it already assumes the walkable surface sits at y=0, which the temple
// garden's ground/pathway/platform all satisfy by construction (see
// GameEnvironment.tsx).

// ─── WebGL unavailable fallback ───────────────────────────────────────────────
function WebGLFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f1a] text-white gap-6 p-8">
      <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl">
        🎮
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-white mb-2">
          WebGL Unavailable
        </h2>
        <p className="text-sm text-white/50 leading-relaxed">
          This preview sandbox has no GPU access. The 3D scene renders correctly
          in a real browser — deploy the app or open it in Chrome / Firefox.
        </p>
      </div>
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
interface SceneProps {
  showStats?: boolean;
  // Optional pass-through so a parent App can drive the HUD's wallet
  // button with real auth state (Google login / dev bypass). When not
  // provided, Scene falls back to its own local placeholder state so it
  // still works standalone.
  walletAddress?: string | null;
  onConnectWallet?: () => void;
  // Task 3: fired once, exactly when the player claims the finale chest.
  // Defaults to a console.log inside FinaleOverlay if not provided.
  onEnigmaComplete?: (payload: { score: number; essences: number }) => void;
}

export default function Scene({
  showStats = false,
  walletAddress: walletAddressProp,
  onConnectWallet: onConnectWalletProp,
  onEnigmaComplete,
}: SceneProps) {
  // Real player HP/max HP from the store (Task: death + restart) — replaces
  // the old local `useState(72)` placeholder, which never actually moved
  // and so never reflected damagePlayer()'s effect on the health bar.
  const playerHp = useGameStore((s) => s.playerHp);
  const playerMaxHp = useGameStore((s) => s.playerMaxHp);
  // Single source of truth: score lives in gameStore (Phase 1). Essences are
  // derived (not stored separately) from puzzle.solved.size so they can
  // never drift out of sync with which puzzles are actually solved, and are
  // capped at 4 to match GameHUD's fixed 4-slot essence tray.
  const score = useGameStore((s) => s.score);
  const essences = useGameStore((s) => Math.min(4, s.puzzle.solved.size));

  // Phase 3: rune-sequence puzzle modal — mounted only while phase==='puzzle'
  // and there's an active puzzle id. closePuzzle/solvePuzzle are the only
  // gameStore actions the modal needs; it never touches Player.tsx.
  const gamePhase = useGameStore((s) => s.phase);
  const activePuzzleId = useGameStore((s) => s.puzzle.activeId);
  const closePuzzle = useGameStore((s) => s.closePuzzle);
  const solvePuzzle = useGameStore((s) => s.solvePuzzle);
  const finaleClaimed = useGameStore((s) => s.finaleClaimed);
  const [finaleOverlayDismissed, setFinaleOverlayDismissed] = useState(false);

  // Task D: puzzle-location map — desktop toggles with "M", mobile taps the
  // icon button GameHUD renders (both drive this same bit of state, so
  // there's exactly one toggle path regardless of input device).
  const [mapOpen, setMapOpen] = useState(false);
  const toggleMap = () => setMapOpen((open) => !open);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") toggleMap();
    };
    // Capture phase, not bubble — PuzzleModal.tsx's root div deliberately
    // calls onKeyDown={(e) => e.stopPropagation()} on every keypress while a
    // puzzle is open (so puzzle-game keys never leak into the 3D scene's
    // WASD controls). Since React attaches its synthetic listeners at the
    // root container and stopPropagation() there calls the underlying
    // native stopPropagation(), a bubble-phase `window` listener never sees
    // the event once focus is inside the modal — the map toggle silently
    // stopped working the moment a player had clicked into a puzzle.
    // Capture-phase listeners run top-down BEFORE that bubble-phase
    // stopPropagation() ever fires, so this is immune to it.
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  // Task B: on-screen joystick + action button replace the keyboard hint
  // strip on touch/narrow-viewport devices.
  const showTouchControls = useShowTouchControls();

  // Death + restart: "Try Again" resets the store AND teleports the player
  // back to spawn in the same click — no extra reactive plumbing needed
  // since this only ever runs from a direct user click on the overlay.
  const restartRun = useGameStore((s) => s.restartRun);
  const handleRestart = () => {
    restartRun();
    teleportPlayerToSpawn();
    playVoiceLine("tryagain_line", "Let's try that again, shall we?", {
      priority: true,
    });
  };

  // Arm the "start music after first interaction" listener once.
  useEffect(() => {
    initMusicOnFirstInteraction();
  }, []);

  // Play a chime whenever a puzzle transitions to solved (essence count
  // increases), and the full victory sting the moment all 4 are collected.
  // Implemented as a plain effect watching the derived `essences` value
  // (not inside gameStore.ts or the puzzle mini-game components) so no
  // existing puzzle/store logic is touched — this is a pure side effect.
  const prevEssences = useRef(essences);
  useEffect(() => {
    if (essences > prevEssences.current) {
      if (essences >= 4) {
        playSfx("victory", 0.7);
        // Pre-finale line, spoken the instant the 4th essence lands — may
        // overlap with FinaleOverlay's own appearance, which is fine.
        if (canTrigger("puzzle-finale-reveal", 20000)) {
          playVoiceLine(
            "prefinale_line",
            "Wait... I know this feeling. I know this place. I think... I think I've always known.",
            { priority: true },
          );
        }
      } else {
        playSfx("chime", 0.6);
      }
    }
    prevEssences.current = essences;
  }, [essences]);

  const [internalWalletAddress, setInternalWalletAddress] = useState<
    string | null
  >(null);

  const handleConnectWallet = () => {
    // Placeholder — Magic Labs + Openfort wiring happens here for Arbitrum Sepolia.
    console.log("TODO: connect wallet (Arbitrum Sepolia)");
    setInternalWalletAddress("0x1234abcd5678ef901234abcd5678ef901234abcd");
  };

  const walletAddress =
    walletAddressProp !== undefined ? walletAddressProp : internalWalletAddress;
  const onConnectWallet = onConnectWalletProp ?? handleConnectWallet;

  if (!isWebGLAvailable()) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-full relative">
      {/* Freeze WASD/sprint input while dead by handing KeyboardControls an
          empty binding map — drei rebuilds its internal store/listeners off
          the `map` prop, so no keys register at all (getKeys() returns all-
          false) until phase leaves 'dead'. Keeps Player.tsx's own movement/
          animation logic completely untouched; the gate lives here instead,
          "before" Player.tsx in the data flow. */}
      <KeyboardControls map={gamePhase === "dead" ? [] : playerKeyboardMap}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 3, 8], fov: 50, near: 0.1, far: 500 }}
          gl={{ antialias: true, alpha: false }}
          style={{ background: "#0a0a18" }}
        >
          {showStats && <Stats />}
          {/* ── Lighting ──────────────────────────────────────────────────── */}
          <Lighting />
          {/* ── Sky / ambience ────────────────────────────────────────────────
            Bright blue daytime look: sun high in the sky, low turbidity for
            a clean atmosphere, soft white clouds drifting well above the
            treeline (y ≈ 40–80). SUN_POSITION is shared with Lighting.tsx's
            shadow-casting sun light so the shadows stay aligned with the
            visible sun. Environment only supplies ambient/reflection
            lighting here (background={false}) — the actual sky dome/color
            comes from <Sky> + the explicit background <color> below. */}
          <Sky
            sunPosition={SUN_POSITION}
            turbidity={1}
            rayleigh={0.4}
            mieCoefficient={0.003}
            mieDirectionalG={0.7}
          />
          <Environment preset="park" background={false} />
          {/* limit raised from 40 to 90 alongside the cloud count below —
              drei's <Clouds> shares this instance budget across every
              <Cloud> child, so more clouds need more headroom or the later
              ones would visibly thin out. */}
          <Clouds material={THREE.MeshBasicMaterial} limit={90} range={60}>
            <Cloud
              seed={1}
              position={[-30, 55, -40]}
              bounds={[40, 8, 40]}
              volume={22}
              opacity={0.55}
              speed={0.06}
            />
            <Cloud
              seed={7}
              position={[35, 68, -20]}
              bounds={[45, 10, 45]}
              volume={26}
              opacity={0.5}
              speed={0.05}
            />
            <Cloud
              seed={13}
              position={[-10, 78, 30]}
              bounds={[50, 9, 50]}
              volume={24}
              opacity={0.5}
              speed={0.07}
            />
            <Cloud
              seed={21}
              position={[25, 45, 45]}
              bounds={[35, 7, 35]}
              volume={18}
              opacity={0.6}
              speed={0.05}
            />
            {/* ── Added for wider/denser sky coverage — same style (soft
                opacity 0.5-0.6, similar volume/bounds/speed ranges),
                spread further out and across a wider altitude band so the
                sky doesn't read as empty away from the original 4. ────── */}
            <Cloud
              seed={33}
              position={[-70, 62, 10]}
              bounds={[42, 9, 42]}
              volume={20}
              opacity={0.5}
              speed={0.055}
            />
            <Cloud
              seed={44}
              position={[60, 40, -60]}
              bounds={[38, 8, 38]}
              volume={19}
              opacity={0.55}
              speed={0.06}
            />
            <Cloud
              seed={55}
              position={[-45, 85, -70]}
              bounds={[48, 11, 48]}
              volume={25}
              opacity={0.5}
              speed={0.045}
            />
            <Cloud
              seed={66}
              position={[80, 72, 40]}
              bounds={[44, 9, 44]}
              volume={22}
              opacity={0.5}
              speed={0.065}
            />
            <Cloud
              seed={77}
              position={[5, 90, -10]}
              bounds={[36, 7, 36]}
              volume={17}
              opacity={0.6}
              speed={0.05}
            />
          </Clouds>
          {/* Explicit background + fog so the horizon blends seamlessly with
            the sky at any zoom/camera distance — no white gaps beyond the
            ground plane or Sky dome. GameEnvironment.tsx intentionally does
            NOT declare its own <fog>; this is the single source of truth.
            Near/far scale with ISLAND_SCALE so the haze still starts well
            past the (now bigger) walkable ground and the far cutoff clears
            DistantScenery's far mountain ring (max radius ~270*scale) and
            floating islands (max radius ~220*scale), letting them fade
            softly into the sky color instead of hard-clipping. */}
          <color attach="background" args={[SKY_COLOR]} />
          <fog
            attach="fog"
            args={[SKY_COLOR, 60 * ISLAND_SCALE, 300 * ISLAND_SCALE]}
          />
          {/* ── Code-generated Japanese temple garden environment ────────────
            Ground, pathway, temple, trees, and puzzle props — see
            GameEnvironment.tsx and its environment/ subcomponents. No GLB
            models are loaded here. */}
          <GameEnvironment />
          {/* ── Merchant ──────────────────────────────────────────────────── */}
          <Merchant /> 
          {/* --- YAHAN MERCHANT ADD KAREIN */}
          {/* ── Player ────────────────────────────────────────────────────── */}
          <Player />
          {/* ── Sprint flying-leaves effect — sibling to Player, does not
            touch its movement/animation state machine. See
            SprintLeaves.tsx. ──────────────────────────────────────────── */}
          <SprintLeaves />
        </Canvas>

        {/* ── Sprint footstep SFX — surrounding wiring only, reads the same
          KeyboardControls context Player.tsx reads; Player.tsx's movement/
          speed logic itself is untouched. ────────────────────────────────── */}
        <SprintFootstepSound />
        <IdleReminder />
      </KeyboardControls>

      {/* ── Alchemist HUD overlay ────────────────────────────────────────── */}
      <GameHUD
        health={playerHp}
        maxHealth={playerMaxHp}
        score={score}
        essences={essences}
        walletAddress={walletAddress as never}
        onConnectWallet={onConnectWallet}
        mapOpen={mapOpen}
        onToggleMap={toggleMap}
        mobileControlsActive={showTouchControls}
      />

      {/* ── Standalone audio mute toggle — separate component from GameHUD
          per the "don't touch GameHUD internals" rule, shares the same
          global mute flag as GameHUD's own speaker button. ─────────────── */}
      <AudioMuteToggle />

      {/* ── Dialogue subtitles — shows whatever line voice.ts is currently
          speaking (intro narration + in-game guidance triggers below). ──── */}
      <SubtitleBar />

      {/* ── Task D: puzzle-location map overlay — toggled by "M" (desktop)
          or GameHUD's map icon (both/mobile). ──────────────────────────── */}
      {mapOpen && <MinimapOverlay onClose={() => setMapOpen(false)} />}

      {/* ── Task B: on-screen joystick + interact button, touch/narrow-
          viewport only — replaces the keyboard hint strip below. ────────── */}
      {showTouchControls && <MobileControls />}

      {/* ── Finale overlay (Task 3c) — shown once the treasure chest is
          claimed, until the player dismisses it. ───────────────────────── */}
      {finaleClaimed && !finaleOverlayDismissed && (
        <FinaleOverlay
          score={score}
          essences={essences}
          onEnigmaComplete={onEnigmaComplete}
          onDismiss={() => setFinaleOverlayDismissed(true)}
        />
      )}

      {/* ── Game Over overlay — shown when playerHp hits 0 (phase 'dead').
          "Try Again" fully resets the run and teleports the player back to
          spawn; see handleRestart above. ─────────────────────────────────── */}
      {gamePhase === "dead" && (
        <GameOverOverlay score={score} onRestart={handleRestart} />
      )}

      {/* ── Rune puzzle modal (Phase 3) ──────────────────────────────────────
          Mounted only while a puzzle is active. onSolved wires straight to
          gameStore.solvePuzzle (which awards +100 score and marks the
          puzzle solved), onClose wires to gameStore.closePuzzle. */}
      {gamePhase === "puzzle" && activePuzzleId && (
        <PuzzleModal
          puzzleId={activePuzzleId}
          onClose={closePuzzle}
          onSolved={solvePuzzle}
          solvedCountBefore={essences}
        />
      )}

      {/* ── Controls hint overlay — desktop-only; touch devices get the
          joystick/action button above instead. ─────────────────────────── */}
      {!showTouchControls && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none select-none">
          {[
            { keys: "W / ↑", label: "Forward" },
            { keys: "S / ↓", label: "Backward" },
            { keys: "A / ←", label: "Strafe L" },
            { keys: "D / →", label: "Strafe R" },
            { keys: "Mouse", label: "Look Around" },
            { keys: "M", label: "Map" },
          ].map(({ keys, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <kbd className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[10px] font-mono text-purple-300">
                {keys}
              </kbd>
              <span className="text-[9px] text-white/30">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
