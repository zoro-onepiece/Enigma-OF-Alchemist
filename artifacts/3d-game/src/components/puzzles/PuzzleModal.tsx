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
import { useState, type ReactElement } from "react";
import RuneMemoryGame from "./RuneMemoryGame";
import AlchemyMatch3Game from "./AlchemyMatch3Game";
import ElementalSudoku from "./games/ElementalSudoku";
import SigilPairsGame from "./SigilPairsGame";

interface PuzzleModalProps {
  puzzleId: string;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
}

interface PuzzleConfig {
  name: string;
  subtitle: string;
  Component: (props: { onWin: () => void }) => ReactElement;
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

export default function PuzzleModal({ puzzleId, onClose, onSolved }: PuzzleModalProps) {
  const [victorious, setVictorious] = useState(false);
  const config = getPuzzleConfig(puzzleId);
  const { Component } = config;

  const handleWin = () => {
    // eslint-disable-next-line no-console
    console.log("[Puzzle] onEssenceEarned:", puzzleId);
    setVictorious(true);
  };

  const handleContinue = () => {
    onSolved(puzzleId);
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

      <div className="relative w-full max-w-md mx-4 rounded-2xl border-2 border-amber-700/60 bg-gradient-to-b from-stone-900 to-stone-950 p-8 shadow-2xl shadow-black/60 font-serif">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-amber-400 font-semibold text-lg tracking-wide">{config.name}</h2>
            <p className="text-white/40 text-xs italic">{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
            aria-label="Close puzzle"
          >
            ×
          </button>
        </div>

        {victorious ? (
          <div
            className="relative text-center py-10 rounded-xl border border-amber-500/50 bg-amber-500/5"
            style={{ animation: "victory-glow 1.6s ease-in-out infinite" }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
              {Array.from({ length: 10 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute text-amber-300 text-sm"
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
            <div className="relative text-5xl mb-4">✨</div>
            <p className="relative text-amber-300 font-semibold text-lg mb-1">
              Essence Conjured!
            </p>
            <p className="relative text-white/60 text-sm italic mb-6">{config.name} solved</p>
            <button
              onClick={handleContinue}
              className="relative rounded-lg border border-emerald-600/70 bg-emerald-900/40 px-6 py-2 text-sm font-semibold uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-900/60"
            >
              Continue
            </button>
          </div>
        ) : (
          <Component onWin={handleWin} />
        )}
      </div>
    </div>
  );
}
