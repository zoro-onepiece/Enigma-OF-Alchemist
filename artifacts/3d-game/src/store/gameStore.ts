/**
 * gameStore
 *
 * Zustand store for client-side game state.
 * Shared between 3D Canvas children (via useFrame) and DOM overlays (HUD, modals).
 *
 * Rules:
 *   - Keep this store flat; avoid nesting.
 *   - Expensive derived values (e.g. sorted monster list) live in selectors, not state.
 *   - On-chain state (NFTs, puzzle completions) is fetched separately via hooks.
 *
 * TODO:
 *   - Install zustand: pnpm --filter @workspace/3d-game add zustand
 *   - Add immer middleware for complex state mutations
 *   - Persist level/xp to localStorage with zustand/middleware/persist
 */
import { create } from "zustand";

export type GamePhase = "menu" | "exploring" | "puzzle" | "inventory" | "dead";

export interface Monster {
  id: string;
  position: [number, number, number];
  hp: number;
  maxHp: number;
}

export interface PuzzleState {
  activeId: string | null;
  solved: Set<string>;
}

interface GameStore {
  // Player stats
  playerHp: number;
  playerMaxHp: number;
  playerMana: number;
  playerMaxMana: number;
  xp: number;
  level: number;

  // Progress
  // Single source of truth for score. Essences are intentionally NOT a
  // separate field — they're derived from puzzle.solved.size wherever
  // needed (see Scene.tsx), so the two can never drift out of sync.
  score: number;

  // World
  monsters: Monster[];
  puzzle: PuzzleState;
  phase: GamePhase;
  inventoryOpen: boolean;

  // Finale (Task 3): whether the player has claimed the reward chest that
  // appears once all 4 essences are collected. Additive to the existing
  // puzzle/phase state above — doesn't change any existing field's meaning.
  finaleClaimed: boolean;

  // Intro story: whether the one-time opening narration has been shown
  // this session. In-memory only (no persist middleware here, same as the
  // rest of this store) — resets on reload, which is fine since it should
  // reappear once per login session, not survive across page refreshes.
  hasSeenIntro: boolean;

  // Voice-line one-shot flags (Part A: pre-recorded dialogue integration).
  // Same "in-memory, once per session, survives a Try Again retry" contract
  // as hasSeenIntro above — a retry shouldn't replay "first meeting"/"first
  // sprint" lines any more than it should replay the intro.
  hasMetMerchant: boolean;
  hasSprinted: boolean;

  // Actions
  setGameState: (patch: Partial<GameStore>) => void;
  damagePlayer: (amount: number) => void;
  healPlayer: (amount: number) => void;
  gainXP: (amount: number) => void;
  addScore: (amount: number) => void;
  killMonster: (id: string) => void;
  openPuzzle: (id: string) => void;
  closePuzzle: () => void;
  solvePuzzle: (id: string) => void;
  openInventory: () => void;
  closeInventory: () => void;
  claimFinale: () => void;
  setHasSeenIntro: () => void;
  setHasMetMerchant: () => void;
  setHasSprinted: () => void;
  // Death + restart: resets the run back to a fresh start after Game Over's
  // "Try Again" — full heal, puzzles/score/phase reset, world position
  // reset (via Player.tsx's teleportPlayerToSpawn, called by the caller
  // alongside this action). Deliberately does NOT reset hasSeenIntro — a
  // retry should never replay the intro story, only a fresh login does.
  restartRun: () => void;
}

// Shared by the store's initial state and restartRun() so a restart is
// guaranteed to land on the exact same fresh-run values, not a
// hand-maintained second copy that could drift out of sync.
function createInitialRunState() {
  return {
    playerHp: 100,
    playerMaxHp: 100,
    playerMana: 80,
    playerMaxMana: 80,
    xp: 0,
    level: 1,
    score: 340,
    monsters: [] as Monster[],
    puzzle: { activeId: null, solved: new Set<string>() } as PuzzleState,
    inventoryOpen: false,
    finaleClaimed: false,
  };
}

export const useGameStore = create<GameStore>((set) => ({
  // ─── Initial state ──────────────────────────────────────────────────────────
  ...createInitialRunState(),
  phase: "menu",
  hasSeenIntro: false,
  hasMetMerchant: false,
  hasSprinted: false,

  // ─── Actions ─────────────────────────────────────────────────────────────────
  setGameState: (patch) => set(patch),

  damagePlayer: (amount) =>
    set((s) => {
      const nextHp = Math.max(0, s.playerHp - amount);
      return { playerHp: nextHp, phase: nextHp <= 0 ? "dead" : s.phase };
    }),

  healPlayer: (amount) =>
    set((s) => ({ playerHp: Math.min(s.playerMaxHp, s.playerHp + amount) })),

  gainXP: (amount) =>
    set((s) => {
      const newXp = s.xp + amount;
      const xpToLevel = s.level * 100;
      return newXp >= xpToLevel
        ? { xp: newXp - xpToLevel, level: s.level + 1 }
        : { xp: newXp };
    }),

  addScore: (amount) => set((s) => ({ score: s.score + amount })),

  killMonster: (id) =>
    set((s) => ({
      monsters: s.monsters.filter((m) => m.id !== id),
    })),

  openPuzzle: (id) =>
    set({ puzzle: { activeId: id, solved: useGameStore.getState().puzzle.solved }, phase: "puzzle" }),

  closePuzzle: () =>
    set((s) => ({ puzzle: { ...s.puzzle, activeId: null }, phase: "exploring" })),

  solvePuzzle: (id) =>
    set((s) => {
      const solved = new Set(s.puzzle.solved);
      solved.add(id);
      return {
        puzzle: { activeId: null, solved },
        phase: "exploring",
        score: s.score + 100,
      };
    }),

  openInventory: () => set({ inventoryOpen: true, phase: "inventory" }),
  closeInventory: () => set({ inventoryOpen: false, phase: "exploring" }),

  claimFinale: () => set({ finaleClaimed: true }),

  setHasSeenIntro: () => set({ hasSeenIntro: true }),
  setHasMetMerchant: () => set({ hasMetMerchant: true }),
  setHasSprinted: () => set({ hasSprinted: true }),

  restartRun: () =>
    set((s) => ({
      ...createInitialRunState(),
      phase: "exploring",
      hasSeenIntro: s.hasSeenIntro,
      hasMetMerchant: s.hasMetMerchant,
      hasSprinted: s.hasSprinted,
    })),
}));
