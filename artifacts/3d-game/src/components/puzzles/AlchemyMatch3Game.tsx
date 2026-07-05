/**
 * AlchemyMatch3Game — Phase 3b
 *
 * 6x6 match-3 grid of 5 alchemical ingredient types. Click a tile then an
 * adjacent tile to swap; the swap is only kept if it creates a 3+ line
 * match (otherwise it silently reverts, no move spent). Matches clear,
 * tiles above fall, new ones spawn at the top, and cascades keep clearing
 * until stable. Win by clearing 15+ tiles within 20 moves; running out of
 * moves first shows a failure state with a restart button (fresh board,
 * unlimited attempts).
 */
import { useState } from "react";

interface AlchemyMatch3GameProps {
  onWin: () => void;
}

const GRID_SIZE = 6;
const INGREDIENT_COUNT = 5;
const INGREDIENTS = ["🔮", "🌿", "⚗️", "🔥", "💧"];
const MAX_MOVES = 20;
const CLEAR_TARGET = 15;

type Grid = number[][];

function randomIngredient(): number {
  return Math.floor(Math.random() * INGREDIENT_COUNT);
}

function makeInitialGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let value: number;
      do {
        value = randomIngredient();
      } while (
        (c >= 2 && row[c - 1] === value && row[c - 2] === value) ||
        (r >= 2 && grid[r - 1][c] === value && grid[r - 2][c] === value)
      );
      row.push(value);
    }
    grid.push(row);
  }
  return grid;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function findMatches(grid: Grid): Set<string> {
  const matched = new Set<string>();

  // Horizontal runs
  for (let r = 0; r < GRID_SIZE; r++) {
    let runStart = 0;
    for (let c = 1; c <= GRID_SIZE; c++) {
      const broke = c === GRID_SIZE || grid[r][c] !== grid[r][runStart];
      if (broke) {
        if (c - runStart >= 3) {
          for (let k = runStart; k < c; k++) matched.add(`${r},${k}`);
        }
        runStart = c;
      }
    }
  }

  // Vertical runs
  for (let c = 0; c < GRID_SIZE; c++) {
    let runStart = 0;
    for (let r = 1; r <= GRID_SIZE; r++) {
      const broke = r === GRID_SIZE || grid[r][c] !== grid[runStart][c];
      if (broke) {
        if (r - runStart >= 3) {
          for (let k = runStart; k < r; k++) matched.add(`${k},${c}`);
        }
        runStart = r;
      }
    }
  }

  return matched;
}

function applyGravityAndRefill(grid: Grid, matched: Set<string>): Grid {
  const next = cloneGrid(grid);
  for (let c = 0; c < GRID_SIZE; c++) {
    const survivors: number[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (!matched.has(`${r},${c}`)) survivors.push(next[r][c]);
    }
    const missing = GRID_SIZE - survivors.length;
    const refilled = Array.from({ length: missing }, () => randomIngredient()).concat(survivors);
    for (let r = 0; r < GRID_SIZE; r++) {
      next[r][c] = refilled[r];
    }
  }
  return next;
}

function isAdjacent(a: { r: number; c: number }, b: { r: number; c: number }): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

export default function AlchemyMatch3Game({ onWin }: AlchemyMatch3GameProps) {
  const [grid, setGrid] = useState<Grid>(() => makeInitialGrid());
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [movesLeft, setMovesLeft] = useState(MAX_MOVES);
  const [cleared, setCleared] = useState(0);
  const [status, setStatus] = useState<"playing" | "lost">("playing");
  const [invalidFlash, setInvalidFlash] = useState<{ r: number; c: number } | null>(null);
  const [resolving, setResolving] = useState(false);

  const resetBoard = () => {
    setGrid(makeInitialGrid());
    setSelected(null);
    setMovesLeft(MAX_MOVES);
    setCleared(0);
    setStatus("playing");
    setResolving(false);
  };

  const resolveCascades = (
    startGrid: Grid,
    startClearedTotal: number,
    movesRemainingAfterThisMove: number,
  ) => {
    let workingGrid = startGrid;
    let clearedTotal = startClearedTotal;

    const step = () => {
      const matches = findMatches(workingGrid);
      if (matches.size === 0) {
        setGrid(workingGrid);
        setCleared(clearedTotal);
        setResolving(false);
        if (clearedTotal >= CLEAR_TARGET) {
          onWin();
        } else if (movesRemainingAfterThisMove <= 0) {
          setStatus("lost");
        }
        return;
      }
      clearedTotal += matches.size;
      workingGrid = applyGravityAndRefill(workingGrid, matches);
      setGrid(workingGrid);
      setCleared(clearedTotal);
      setTimeout(step, 260);
    };

    setResolving(true);
    step();
  };

  const handleTileClick = (r: number, c: number) => {
    if (status !== "playing" || resolving) return;

    if (!selected) {
      setSelected({ r, c });
      return;
    }

    if (selected.r === r && selected.c === c) {
      setSelected(null);
      return;
    }

    if (!isAdjacent(selected, { r, c })) {
      setSelected({ r, c });
      return;
    }

    // Tentative swap
    const tentative = cloneGrid(grid);
    const tmp = tentative[selected.r][selected.c];
    tentative[selected.r][selected.c] = tentative[r][c];
    tentative[r][c] = tmp;

    const matches = findMatches(tentative);
    setSelected(null);

    if (matches.size === 0) {
      setInvalidFlash({ r, c });
      setTimeout(() => setInvalidFlash(null), 250);
      return;
    }

    const movesRemaining = movesLeft - 1;
    setMovesLeft(movesRemaining);
    resolveCascades(tentative, cleared, movesRemaining);
  };

  return (
    <div>
      <p className="text-white/60 text-sm mb-3 text-center italic">
        Swap adjacent ingredients to align 3 or more.
      </p>

      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-amber-300/80 mb-3 px-1">
        <span>Moves left: {movesLeft}</span>
        <span>
          Cleared: {Math.min(cleared, CLEAR_TARGET)} / {CLEAR_TARGET}
        </span>
      </div>

      <div className="relative">
        <div
          className="grid gap-1 mx-auto"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, maxWidth: 320 }}
        >
          {grid.map((row, r) =>
            row.map((value, c) => {
              const isSelected = selected?.r === r && selected?.c === c;
              const isInvalid = invalidFlash?.r === r && invalidFlash?.c === c;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleTileClick(r, c)}
                  disabled={status !== "playing" || resolving}
                  className="aspect-square flex items-center justify-center rounded-md border text-lg transition-all disabled:cursor-not-allowed"
                  style={{
                    borderColor: isSelected
                      ? "#facc15"
                      : isInvalid
                        ? "#f43f5e"
                        : "rgba(255,255,255,0.12)",
                    backgroundColor: isSelected
                      ? "rgba(250,204,21,0.15)"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: isSelected ? "0 0 10px rgba(250,204,21,0.5)" : "none",
                  }}
                >
                  {INGREDIENTS[value]}
                </button>
              );
            }),
          )}
        </div>

        {status === "lost" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-xl bg-stone-950/90">
            <p className="text-red-400 font-semibold">The mixture failed.</p>
            <button
              onClick={resetBoard}
              className="rounded-lg border border-amber-600/70 bg-stone-800 px-4 py-2 text-sm text-amber-200 hover:bg-stone-700 transition-colors"
            >
              Restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
