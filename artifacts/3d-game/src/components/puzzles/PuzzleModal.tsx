/**
 * PuzzleModal — Phase 2 framework (replaces the dead ui/PuzzleModal.tsx)
 *
 * Fantasy-styled DOM overlay mounted by Scene.tsx whenever
 * gameStore.phase === 'puzzle'. Maps each of the 4 world puzzle ids to a
 * distinct mini-game component (Rune Memory, Alchemy Match-3, Runic
 * Lights, Sigil Pairs). The close (X) button sets phase back to
 * 'exploring' via onClose WITHOUT solving the puzzle, so it stays
 * unsolved and replayable. All key/mouse events inside the modal call
 * stopPropagation so they never leak through to the 3D scene's controls.
 *
 * On a mini-game win, a golden victory overlay is shown inside the modal;
 * its Continue button is what actually calls onSolved(puzzleId) (which
 * wires straight to gameStore.solvePuzzle — awarding +100 score and
 * marking the puzzle solved) and only then does the puzzle close.
 */
import { useEffect, useState, type ReactElement } from "react";
import RuneMemoryGame from "./RuneMemoryGame";
import AlchemyMatch3Game from "./AlchemyMatch3Game";
import ElementalSudoku from "./games/ElementalSudoku";
import SigilPairsGame from "./SigilPairsGame";
import { useGameStore } from "../../store/gameStore";
import { playVoiceLine, canTrigger, type VoiceLineName } from "../../audio/voice";

// HP cost per lost mini-game attempt (10 losses = death at 100 max HP).
// Single source of truth for all 4 games — each calls its own onLose() at
// its own fail/retry transition (see RuneMemoryGame/SigilPairsGame/
// ElementalSudoku/AlchemyMatch3Game), but the actual damage amount is only
// ever applied here, in handleLose below.
const PUZZLE_FAIL_DAMAGE = 10;

interface PuzzleModalProps {
  puzzleId: string;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
  // How many puzzles were already solved before this one (0-3) — used to
  // pick the ordinal (1st..4th) flavor line below, independent of which
  // specific puzzle this is, since players can solve them in any order.
  solvedCountBefore?: number;
}

// Ordinal flavor text shown under "Essence Conjured!" — indexed by how many
// puzzles were solved before this one (0 = this is the 1st solve, etc.).
const ORDINAL_FLAVOR_TEXT = [
  "A fragment of forgotten power stirs within you...",
  "The garden itself seems to recognize you now.",
  "Something ancient is remembering your name.",
  "The final seal breaks. You feel... complete.",
];

// Spoken counterpart to ORDINAL_FLAVOR_TEXT above — same indexing
// (solvedCountBefore), same "any order" independence from which specific
// puzzle this is.
const ORDINAL_VOICE_LINES = [
  "Yes! I can feel it — something ancient stirring inside you.",
  "Two seals broken. The garden is starting to remember you.",
  "Almost there. One shrine left standing between you and the truth.",
  "That's the last one! Something is about to change...",
];
// Pre-recorded per solve-ordinal, same indexing (solvedCountBefore) as
// ORDINAL_VOICE_LINES above — was live speechSynthesis, now a fixed MP3
// per ordinal with the same text shown in the subtitle.
const ORDINAL_VOICE_LINE_NAMES: VoiceLineName[] = [
  "puzzle_solved_1st",
  "puzzle_solved_2nd",
  "puzzle_solved_3rd",
  "puzzle_solved_4th",
];
const ORDINAL_VOICE_COOLDOWN_MS = 20000;

interface PuzzleConfig {
  name: string;
  subtitle: string;
  Component: (props: { onWin: () => void; onLose?: () => void }) => ReactElement;
}

// Deterministic id → mini-game mapping. Any puzzle id not in this map
// falls back to Rune Memory so a fifth/sixth GlowingPuzzle placed later
// still gets a working game instead of a blank modal.
const PUZZLE_CONFIG: Record<string, PuzzleConfig> = {
  "puzzle-1": {
    name: "Rune Memory",
    subtitle: "Awaken the Essence",
    Component: RuneMemoryGame,
  },
  "puzzle-2": {
    name: "Alchemy Match-3",
    subtitle: "Align the Ingredients",
    Component: AlchemyMatch3Game,
  },
  "puzzle-3": {
    name: "Elemental Sudoku",
    subtitle: "Balance the Elements",
    Component: ElementalSudoku,
  },
  "puzzle-4": {
    name: "Sigil Pairs",
    subtitle: "Recall the Symbols",
    Component: SigilPairsGame,
  },
};

function getPuzzleConfig(puzzleId: string): PuzzleConfig {
  return PUZZLE_CONFIG[puzzleId] ?? PUZZLE_CONFIG["puzzle-1"];
}

export default function PuzzleModal({
  puzzleId,
  onClose,
  onSolved,
  solvedCountBefore = 0,
}: PuzzleModalProps) {
  const [victorious, setVictorious] = useState(false);
  const config = getPuzzleConfig(puzzleId);
  const { Component } = config;
  const flavorText =
    ORDINAL_FLAVOR_TEXT[Math.min(solvedCountBefore, ORDINAL_FLAVOR_TEXT.length - 1)];
  const damagePlayer = useGameStore((s) => s.damagePlayer);

  // Speak the ordinal encouragement line the instant this puzzle is won —
  // same solvedCountBefore index as the ORDINAL_FLAVOR_TEXT shown above,
  // gated by the shared trigger cooldown so a re-render never double-fires it.
  useEffect(() => {
    if (!victorious) return;
    const ordinalIndex = Math.min(solvedCountBefore, ORDINAL_VOICE_LINES.length - 1);
    const line = ORDINAL_VOICE_LINES[ordinalIndex];
    if (canTrigger(`puzzle-solved-${solvedCountBefore}`, ORDINAL_VOICE_COOLDOWN_MS)) {
      playVoiceLine(ORDINAL_VOICE_LINE_NAMES[ordinalIndex], line, { priority: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [victorious]);

  const handleWin = () => {
    // eslint-disable-next-line no-console
    console.log("[Puzzle] onEssenceEarned:", puzzleId);
    setVictorious(true);
  };

  const handleContinue = () => {
    onSolved(puzzleId);
  };

  // Costs HP on a failed mini-game attempt — fires gameStore.damagePlayer,
  // which clamps HP at 0 and flips phase to 'dead' in the same action if
  // this was the fatal blow (see gameStore.ts). The mini-game itself keeps
  // its own local retry UI (e.g. Alchemy Match-3's internal "Restart"
  // button) — this is purely the world-state consequence layered on top.
  //
  // This is the only damagePlayer() call site in the game right now, so a
  // generic "damage reaction" line and "mini-game failed" line would always
  // fire together here — per spec, minigame_fail takes priority and the
  // damage_reaction_1/2 lines (see voice.ts) are reserved for a future
  // non-mini-game damage source instead of also playing (and queuing
  // behind) a second line every single failed attempt.
  const handleLose = () => {
    damagePlayer(PUZZLE_FAIL_DAMAGE);
    playVoiceLine(
      "minigame_fail",
      "The mixture failed... but failure teaches as much as success.",
      { priority: true },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      tabIndex={-1}
    >
      <style>{`
        @keyframes puzzle-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes puzzle-smoke {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes victory-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(250,204,21,0.5); }
          50% { box-shadow: 0 0 40px rgba(250,204,21,0.9); }
        }
        @keyframes victory-particle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.3); opacity: 0; }
        }
      `}</style>

      <div className="relative w-full max-w-md lg:max-w-xl xl:max-w-2xl mx-3 sm:mx-4 rounded-2xl border-2 border-amber-700/60 bg-gradient-to-b from-stone-900 to-stone-950 p-4 sm:p-8 lg:p-10 xl:p-12 shadow-2xl shadow-black/60 font-serif max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
          <div>
            <h2 className="text-amber-400 font-semibold text-base sm:text-lg lg:text-2xl xl:text-3xl tracking-wide">{config.name}</h2>
            <p className="text-white/40 text-[11px] sm:text-xs lg:text-sm xl:text-base italic">{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-11 w-11 lg:h-14 lg:w-14 shrink-0 items-center justify-center text-white/30 hover:text-white/70 transition-colors text-xl lg:text-3xl leading-none"
            aria-label="Close puzzle"
          >
            ×
          </button>
        </div>

        {victorious ? (
          <div
            className="relative text-center py-10 lg:py-14 rounded-xl border border-amber-500/50 bg-amber-500/5"
            style={{ animation: "victory-glow 1.6s ease-in-out infinite" }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-amber-300 text-sm lg:text-lg"
                  style={{
                    left: `${10 + i * 8}%`,
                    bottom: "20%",
                    animation: `victory-particle ${1.2 + (i % 4) * 0.3}s ease-out ${i * 0.08}s infinite`,
                  }}
                >
                  ✦
                </span>
              ))}
            </div>
            <div className="relative text-5xl lg:text-7xl mb-4 lg:mb-6">✨</div>
            <p className="relative text-amber-300 font-semibold text-lg lg:text-2xl xl:text-3xl mb-1">
              Essence Conjured!
            </p>
            <p className="relative text-white/60 text-sm lg:text-base xl:text-lg italic mb-1">{config.name} solved</p>
            <p className="relative text-emerald-300/90 text-sm lg:text-base xl:text-lg italic mb-6 lg:mb-8">{flavorText}</p>
            <button
              onClick={handleContinue}
              className="relative rounded-lg border border-emerald-600/70 bg-emerald-900/40 px-6 py-2 lg:px-10 lg:py-4 text-sm lg:text-lg font-semibold uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-900/60"
            >
              Continue
            </button>
          </div>
        ) : (
          <Component onWin={handleWin} onLose={handleLose} />
        )}
      </div>
    </div>
  );
}
