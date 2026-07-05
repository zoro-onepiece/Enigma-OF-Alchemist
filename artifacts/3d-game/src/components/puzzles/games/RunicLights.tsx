/**
 * RunicLights — replacement for Game 3 (Potion Mixing)
 *
 * "Lights Out" style toggle puzzle on a 3x3 grid of rune tiles. Clicking a
 * tile flips itself and its orthogonal (up/down/left/right, no diagonal)
 * neighbors. Goal: get every tile lit.
 *
 * Solvability guarantee: toggle moves in Lights Out are self-inverse and
 * commute, so any board reached by applying a sequence of toggles FROM the
 * all-lit (solved) state is always solvable — just re-apply the same set
 * of toggles (in any order) to return to all-lit. We build the scrambled
 * board that way instead of randomizing tile states directly, which could
 * otherwise produce unsolvable boards.
 */
import { useEffect, useRef, useState } from "react";
import { useRunicSound } from "./useRunicSound";

interface RunicLightsProps {
  onWin: () => void;
}

const GRID_SIZE = 3;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const MIN_SCRAMBLE_MOVES = 5;
const MAX_SCRAMBLE_MOVES = 7;
const STUCK_HINT_MOVE_THRESHOLD = 15;

function neighborsOf(index: number): number[] {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const result = [index];
  if (row > 0) result.push(index - GRID_SIZE);
  if (row < GRID_SIZE - 1) result.push(index + GRID_SIZE);
  if (col > 0) result.push(index - 1);
  if (col < GRID_SIZE - 1) result.push(index + 1);
  return result;
}

function applyToggle(lit: boolean[], index: number): boolean[] {
  const next = [...lit];
  for (const n of neighborsOf(index)) {
    next[n] = !next[n];
  }
  return next;
}

function generateScrambledBoard(): boolean[] {
  let board: boolean[];
  do {
    board = Array.from({ length: CELL_COUNT }, () => true);
    const moveCount =
      MIN_SCRAMBLE_MOVES + Math.floor(Math.random() * (MAX_SCRAMBLE_MOVES - MIN_SCRAMBLE_MOVES + 1));
    for (let i = 0; i < moveCount; i++) {
      const randomIndex = Math.floor(Math.random() * CELL_COUNT);
      board = applyToggle(board, randomIndex);
    }
    // Guard against a scramble that cancelled itself back to all-lit.
  } while (board.every((lit) => lit));
  return board;
}

export default function RunicLights({ onWin }: RunicLightsProps) {
  const [lit, setLit] = useState<boolean[]>(() => generateScrambledBoard());
  const [moves, setMoves] = useState(0);
  const [rippling, setRippling] = useState<Set<number>>(new Set());
  const [showStuckHint, setShowStuckHint] = useState(false);
  const rippleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playToggle, playWin, playHint } = useRunicSound();

  const handleReset = () => {
    setLit(generateScrambledBoard());
    setMoves(0);
    setRippling(new Set());
    setShowStuckHint(false);
  };

  const handleTileClick = (index: number) => {
    const next = applyToggle(lit, index);
    setLit(next);
    setMoves((m) => m + 1);
    playToggle(next[index]);

    // Briefly mark the clicked tile + its neighbors so each one plays a
    // ripple animation, visually tying the click to the tiles it affects.
    if (rippleTimeout.current) clearTimeout(rippleTimeout.current);
    setRippling(new Set(neighborsOf(index)));
    rippleTimeout.current = setTimeout(() => setRippling(new Set()), 420);

    if (next.every((v) => v)) {
      setShowStuckHint(false);
      setTimeout(() => playWin(), 80);
      setTimeout(() => onWin(), 250);
    }
  };

  // Nudge the player toward Reset if they've been grinding for a while
  // without solving it — a scramble is never unsolvable, but a fresh
  // board can feel friendlier than hunting for the last few moves.
  useEffect(() => {
    if (moves > 0 && moves % STUCK_HINT_MOVE_THRESHOLD === 0 && !lit.every((v) => v)) {
      setShowStuckHint(true);
      playHint();
    }
  }, [moves, lit, playHint]);

  return (
    <div>
      <p className="text-white/60 text-sm mb-4 text-center italic">
        Awaken every rune — each touch ripples to its neighbors.
      </p>

      <div className="flex items-center justify-center text-[11px] uppercase tracking-[0.2em] text-amber-300/80 mb-4">
        Moves: {moves}
      </div>

      <div
        className="grid gap-2 mx-auto mb-6"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, maxWidth: 220 }}
      >
        {lit.map((isLit, i) => {
          const isRippling = rippling.has(i);
          return (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              className="aspect-square flex items-center justify-center rounded-lg border-2 text-2xl transition-all"
              style={{
                borderColor: isLit ? "#f59e0b" : "rgba(255,255,255,0.12)",
                backgroundColor: isLit ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.03)",
                boxShadow: isLit ? "0 0 16px rgba(245,158,11,0.55)" : "none",
                animation: isRippling
                  ? "runic-ripple 0.42s ease-out"
                  : isLit
                    ? "runic-pulse 1.8s ease-in-out infinite"
                    : undefined,
              }}
            >
              <span
                style={{
                  color: isLit ? "#facc15" : "#57534e",
                  textShadow: isLit ? "0 0 8px rgba(250,204,21,0.8)" : "none",
                }}
              >
                ᛝ
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes runic-pulse {
          0%, 100% { box-shadow: 0 0 16px rgba(245,158,11,0.55); }
          50% { box-shadow: 0 0 26px rgba(245,158,11,0.85); }
        }
        @keyframes runic-ripple {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(250,204,21,0); }
          35% { transform: scale(1.12); box-shadow: 0 0 30px rgba(250,204,21,0.9); }
          100% { transform: scale(1); box-shadow: 0 0 16px rgba(245,158,11,0.55); }
        }
        @keyframes runic-hint-in {
          0% { opacity: 0; transform: translateY(-6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {showStuckHint && (
        <div
          className="mb-4 rounded-lg border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-200/90"
          style={{ animation: "runic-hint-in 0.25s ease-out" }}
        >
          Still tangled? Try{" "}
          <button
            onClick={handleReset}
            className="underline underline-offset-2 hover:text-amber-100"
          >
            resetting the runes
          </button>{" "}
          for a fresh pattern.
        </div>
      )}

      <button
        onClick={handleReset}
        className="w-full rounded-lg border border-amber-700/60 bg-stone-800/60 py-2 text-sm text-amber-200 hover:bg-stone-700/60 transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
