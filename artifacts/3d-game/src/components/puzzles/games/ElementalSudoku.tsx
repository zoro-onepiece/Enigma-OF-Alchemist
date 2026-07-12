/**
 * ElementalSudoku — replacement for Game 3 (previously Runic Lights)
 *
 * A 4x4 sudoku using 4 alchemical element symbols instead of numbers:
 * 🜁 (air), 🜂 (fire), 🜄 (water), 🜃 (earth). Each symbol must appear
 * exactly once per row, per column, and per 2x2 box.
 *
 * Board generation: start from a known-valid base 4x4 grid, then apply
 * random structure-preserving transforms (row swaps within a band, column
 * swaps within a band, band swaps, and a random relabeling of the 4
 * symbols). All of these transforms preserve row/column/box validity, so
 * the result is always a complete, valid solution. The puzzle is then
 * created by blanking 8-10 cells from that solution, which guarantees the
 * puzzle is solvable (the blanked values can always be restored).
 *
 * Conflict handling: placing a symbol is always allowed (soft guidance)
 * — if it immediately conflicts with the same row/column/box, the
 * conflicting cells flash red briefly, but the placement stands.
 */
import { useEffect, useRef, useState } from "react";

interface ElementalSudokuProps {
  onWin: () => void;
  onLose?: () => void;
}

const SIZE = 4;
const CELL_COUNT = SIZE * SIZE;
const MIN_BLANKS = 8;
const MAX_BLANKS = 10;

const SYMBOLS = ["🜁", "🜂", "🜄", "🜃"] as const;
const SYMBOL_NAMES = ["Air", "Fire", "Water", "Earth"] as const;
const SYMBOL_COLORS = ["#c4b5fd", "#f87171", "#60a5fa", "#4ade80"] as const;

function rowOf(i: number) {
  return Math.floor(i / SIZE);
}
function colOf(i: number) {
  return i % SIZE;
}
function boxOf(i: number) {
  return Math.floor(rowOf(i) / 2) * 2 + Math.floor(colOf(i) / 2);
}

function swapRows(grid: number[][], a: number, b: number) {
  const tmp = grid[a];
  grid[a] = grid[b];
  grid[b] = tmp;
}

function swapCols(grid: number[][], a: number, b: number) {
  for (let r = 0; r < SIZE; r++) {
    const tmp = grid[r][a];
    grid[r][a] = grid[r][b];
    grid[r][b] = tmp;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Known-valid 4x4 base grid (values 0-3): unique per row/col/2x2 box. */
const BASE_GRID: number[][] = [
  [0, 1, 2, 3],
  [2, 3, 0, 1],
  [1, 0, 3, 2],
  [3, 2, 1, 0],
];

function generateSolution(): number[][] {
  const grid = BASE_GRID.map((row) => [...row]);

  if (Math.random() < 0.5) swapRows(grid, 0, 1);
  if (Math.random() < 0.5) swapRows(grid, 2, 3);
  if (Math.random() < 0.5) {
    swapRows(grid, 0, 2);
    swapRows(grid, 1, 3);
  }
  if (Math.random() < 0.5) swapCols(grid, 0, 1);
  if (Math.random() < 0.5) swapCols(grid, 2, 3);
  if (Math.random() < 0.5) {
    swapCols(grid, 0, 2);
    swapCols(grid, 1, 3);
  }

  const relabel = shuffle([0, 1, 2, 3]);
  return grid.map((row) => row.map((v) => relabel[v]));
}

function generatePuzzle(): { solution: number[]; givens: boolean[]; values: (number | null)[] } {
  const solutionGrid = generateSolution();
  const solution: number[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      solution.push(solutionGrid[r][c]);
    }
  }

  const blankCount = MIN_BLANKS + Math.floor(Math.random() * (MAX_BLANKS - MIN_BLANKS + 1));
  const indices = shuffle(Array.from({ length: CELL_COUNT }, (_, i) => i)).slice(0, blankCount);
  const blanked = new Set(indices);

  const givens = Array.from({ length: CELL_COUNT }, (_, i) => !blanked.has(i));
  const values: (number | null)[] = solution.map((v, i) => (blanked.has(i) ? null : v));

  return { solution, givens, values };
}

function conflictsFor(values: (number | null)[], index: number): number[] {
  const value = values[index];
  if (value === null) return [];
  const row = rowOf(index);
  const col = colOf(index);
  const box = boxOf(index);
  const conflicts: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (i === index) continue;
    if (values[i] === null) continue;
    if (values[i] !== value) continue;
    if (rowOf(i) === row || colOf(i) === col || boxOf(i) === box) {
      conflicts.push(i);
    }
  }
  return conflicts;
}

function isBoardComplete(values: (number | null)[]): boolean {
  return values.every((v) => v !== null);
}

function isBoardValid(values: (number | null)[]): boolean {
  const checkGroup = (indices: number[]) => {
    const seen = new Set<number>();
    for (const i of indices) {
      const v = values[i];
      if (v === null || seen.has(v)) return false;
      seen.add(v);
    }
    return true;
  };

  for (let r = 0; r < SIZE; r++) {
    const rowIndices = Array.from({ length: SIZE }, (_, c) => r * SIZE + c);
    if (!checkGroup(rowIndices)) return false;
  }
  for (let c = 0; c < SIZE; c++) {
    const colIndices = Array.from({ length: SIZE }, (_, r) => r * SIZE + c);
    if (!checkGroup(colIndices)) return false;
  }
  for (let br = 0; br < 2; br++) {
    for (let bc = 0; bc < 2; bc++) {
      const boxIndices: number[] = [];
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          boxIndices.push((br * 2 + r) * SIZE + (bc * 2 + c));
        }
      }
      if (!checkGroup(boxIndices)) return false;
    }
  }
  return true;
}

export default function ElementalSudoku({ onWin, onLose }: ElementalSudokuProps) {
  const [board, setBoard] = useState(() => generatePuzzle());
  const [selectedSymbol, setSelectedSymbol] = useState<number | null>(0);
  const [conflictCells, setConflictCells] = useState<Set<number>>(new Set());
  const conflictTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wonRef = useRef(false);

  const { givens, values } = board;

  const handleNewBoard = () => {
    setBoard(generatePuzzle());
    setConflictCells(new Set());
    wonRef.current = false;
  };

  // Unlike the other three mini-games, Sudoku has no move limit or hard-
  // fail state by design — placements are freely revisable forever
  // (conflicts just flash, the board is never unrecoverable). "Reset"
  // (discarding every placement back to the givens) is the one action
  // that's an explicit admission the current attempt isn't working out —
  // the direct analog of Alchemy Match-3's "Restart" after running out of
  // moves — so it's the fail/retry transition that costs HP here.
  // "New Board" is left uncosted since it's closer to skipping to a
  // different puzzle than failing this one.
  const handleReset = () => {
    onLose?.();
    setBoard((prev) => ({
      solution: prev.solution,
      givens: prev.givens,
      values: prev.givens.map((isGiven, i) => (isGiven ? prev.solution[i] : null)),
    }));
    setConflictCells(new Set());
    wonRef.current = false;
  };

  const handleCellClick = (index: number) => {
    if (givens[index]) return;

    setBoard((prev) => {
      const nextValues = [...prev.values];

      if (selectedSymbol === null) {
        nextValues[index] = null;
      } else if (nextValues[index] === selectedSymbol) {
        nextValues[index] = null;
      } else {
        nextValues[index] = selectedSymbol;
      }

      const conflicts = conflictsFor(nextValues, index);
      if (conflictTimeout.current) clearTimeout(conflictTimeout.current);
      if (conflicts.length > 0) {
        setConflictCells(new Set([index, ...conflicts]));
        conflictTimeout.current = setTimeout(() => setConflictCells(new Set()), 500);
      } else {
        setConflictCells(new Set());
      }

      return { ...prev, values: nextValues };
    });
  };

  useEffect(() => {
    if (wonRef.current) return;
    if (isBoardComplete(values) && isBoardValid(values)) {
      wonRef.current = true;
      setTimeout(() => onWin(), 250);
    }
  }, [values, onWin]);

  useEffect(() => {
    return () => {
      if (conflictTimeout.current) clearTimeout(conflictTimeout.current);
    };
  }, []);

  return (
    <div>
      <p className="text-white/60 text-sm mb-4 text-center italic">
        Balance the elements — each symbol once per row, column, and box.
      </p>

      <div
        className="grid mx-auto mb-5 rounded-lg overflow-hidden border-2 border-amber-700/70 bg-stone-950"
        style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, maxWidth: 260 }}
      >
        {values.map((value, i) => {
          const row = rowOf(i);
          const col = colOf(i);
          const isGiven = givens[i];
          const isConflict = conflictCells.has(i);
          const symbol = value !== null ? SYMBOLS[value] : null;
          const color = value !== null ? SYMBOL_COLORS[value] : undefined;

          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              disabled={isGiven}
              className="aspect-square flex items-center justify-center text-2xl transition-colors"
              style={{
                borderTop: row % 2 === 0 ? "2px solid rgba(217,119,6,0.7)" : "1px solid rgba(217,119,6,0.25)",
                borderLeft: col % 2 === 0 ? "2px solid rgba(217,119,6,0.7)" : "1px solid rgba(217,119,6,0.25)",
                borderRight: col === SIZE - 1 ? "2px solid rgba(217,119,6,0.7)" : "none",
                borderBottom: row === SIZE - 1 ? "2px solid rgba(217,119,6,0.7)" : "none",
                backgroundColor: isConflict
                  ? "rgba(248,113,113,0.35)"
                  : isGiven
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(255,255,255,0.02)",
                boxShadow: isGiven ? "inset 0 0 10px rgba(0,0,0,0.5)" : "none",
                cursor: isGiven ? "default" : "pointer",
                animation: isConflict ? "sudoku-conflict 0.5s ease-out" : undefined,
              }}
            >
              {symbol && (
                <span
                  style={{
                    color,
                    textShadow: isGiven ? "none" : `0 0 8px ${color}99`,
                    opacity: isGiven ? 0.85 : 1,
                    fontWeight: isGiven ? 700 : 500,
                  }}
                >
                  {symbol}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes sudoku-conflict {
          0%, 100% { background-color: rgba(248,113,113,0.35); }
          50% { background-color: rgba(248,113,113,0.65); }
        }
      `}</style>

      <div className="flex items-center justify-center gap-2 mb-5">
        {SYMBOLS.map((symbol, i) => (
          <button
            key={i}
            onClick={() => setSelectedSymbol(i)}
            aria-label={SYMBOL_NAMES[i]}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-2 text-xl transition-all"
            style={{
              borderColor: selectedSymbol === i ? SYMBOL_COLORS[i] : "rgba(255,255,255,0.15)",
              backgroundColor: selectedSymbol === i ? `${SYMBOL_COLORS[i]}22` : "rgba(255,255,255,0.03)",
              boxShadow: selectedSymbol === i ? `0 0 12px ${SYMBOL_COLORS[i]}88` : "none",
              color: SYMBOL_COLORS[i],
            }}
          >
            {symbol}
          </button>
        ))}
        <button
          onClick={() => setSelectedSymbol(null)}
          aria-label="Eraser"
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm transition-all"
          style={{
            borderColor: selectedSymbol === null ? "#e2e8f0" : "rgba(255,255,255,0.15)",
            backgroundColor: selectedSymbol === null ? "rgba(226,232,240,0.15)" : "rgba(255,255,255,0.03)",
            boxShadow: selectedSymbol === null ? "0 0 12px rgba(226,232,240,0.6)" : "none",
            color: "#e2e8f0",
          }}
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1 rounded-lg border border-amber-700/60 bg-stone-800/60 py-2 text-sm text-amber-200 hover:bg-stone-700/60 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleNewBoard}
          className="flex-1 rounded-lg border border-amber-700/60 bg-stone-800/60 py-2 text-sm text-amber-200 hover:bg-stone-700/60 transition-colors"
        >
          New Board
        </button>
      </div>
    </div>
  );
}
