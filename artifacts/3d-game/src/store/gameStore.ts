/**
 * gameStore
 *
 * Zustand store for client-side game state.
 * Shared between 3D Canvas children (via useFrame) and DOM overlays (HUD, modals).
 *
 * Rules:
 *   - Keep this store flat; avoid nesting.
 *   - Expensive derived values (e.g. sorted monster list) live in selectors, not state.
 *
 * TODO:
 *   - Add immer middleware for complex state mutations
 *   - Persist level/xp to localStorage with zustand/middleware/persist
 */
import { create } from "zustand";

export type GamePhase = "menu" | "exploring" | "puzzle" | "shop" | "inventory" | "dead";

// Skin catalog ids — must match EnigmaRelics.sol's SKIN_* constants and the
// Merchant shop listing (see MerchantShop.tsx).
export type SkinId = 1 | 2 | 3;

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

export interface OwnedRelic {
  puzzleId: string;
  name: string;
  image: string;
  txHash: string | null;
}

// Puzzle-reward NFT catalog — one alchemist-themed relic per world puzzle.
// tokenURI points at the static metadata JSON served from public/metadata/
// (see LockerModal.tsx for display, Scene.tsx for the mint-on-solve wiring).
export const PUZZLE_RELICS: Record<string, { name: string; image: string; tokenURI: string }> = {
  "puzzle-1": { name: "Philosopher's Stone", image: "/relics/1.png", tokenURI: "/metadata/1.json" },
  "puzzle-2": { name: "Elixir of Life", image: "/relics/2.png", tokenURI: "/metadata/2.json" },
  "puzzle-3": { name: "Mystic Hourglass", image: "/relics/3.png", tokenURI: "/metadata/3.json" },
  "puzzle-4": { name: "Aether Compass", image: "/relics/4.png", tokenURI: "/metadata/4.json" },
};

// The API server only answers under the reverse proxy (see CLAUDE.md: "always
// hit services through the proxy... never a raw service port directly") —
// hitting a raw dev port directly returns a plain 404/503 with no body.
// `res.json()` on that throws a cryptic "Unexpected end of JSON input" that
// masks the real problem, so parse defensively and surface a readable
// message either way.
async function parseJsonSafe(res: Response): Promise<{ error?: string; success?: boolean; txHash?: string | null }> {
  const text = await res.text();
  if (!text) return { error: `${res.status} ${res.statusText || "No response body"}` };
  try {
    return JSON.parse(text);
  } catch {
    return { error: `${res.status}: unexpected non-JSON response` };
  }
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
  // Locker/Inventory — standalone, toggled by the "I" key or a HUD button
  // (see LockerModal.tsx), independent of Merchant proximity.
  inventoryOpen: boolean;
  // Merchant Shop — only opens via Merchant.tsx's "Press E to Trade" prompt
  // (see MerchantShop.tsx).
  shopOpen: boolean;

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
  // Merchant skins (Openfort x402 purchases): which skins the connected
  // wallet owns and which one is currently equipped. Not part of
  // createInitialRunState — a death/restart shouldn't un-buy a skin, same
  // reasoning as hasSeenIntro above.
  ownedSkins: Set<SkinId>;
  equippedSkin: SkinId | null;
  // Surfaced by buySkin() below for MerchantShop.tsx to display; cleared at
  // the start of every new attempt.
  skinPurchaseError: string | null;

  // Puzzle-reward NFTs actually minted on-chain via /api/rewards/mint (see
  // mintPuzzleReward below). Not part of createInitialRunState — these are
  // real minted tokens, a death/restart doesn't burn them.
  ownedRelics: OwnedRelic[];
  isMintingReward: boolean;

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
  openShop: () => void;
  closeShop: () => void;
  claimFinale: () => void;
  setHasSeenIntro: () => void;
  // Full x402 checkout handshake against /api/merchant/checkout — challenge,
  // then settle with a payment header, then marks the skin owned on
  // success. Returns whether the purchase succeeded (MerchantShop.tsx uses
  // this to drive its own per-button "Buying…" spinner state).
  buySkin: (skinId: SkinId, playerAddress: string) => Promise<boolean>;
  setHasMetMerchant: () => void;
  setHasSprinted: () => void;
  // Marks a skin as owned after a successful x402 checkout (see
  // ShopInventoryModal.tsx's Shop tab).
  // Equips an already-owned skin; no-ops if the skin isn't owned (see
  // LockerModal.tsx).
  equipSkin: (skinId: SkinId) => void;
  // Calls /api/rewards/mint (Openfort-sponsored mintPuzzleReward) for the
  // relic mapped to this puzzle in PUZZLE_RELICS. Best-effort: a failed
  // mint is logged, not thrown, so it never blocks the puzzle-solved
  // celebration UI which has already run via solvePuzzle().
  mintPuzzleReward: (puzzleId: string, playerAddress: string | null) => Promise<void>;
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
    shopOpen: false,
    finaleClaimed: false,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ─── Initial state ──────────────────────────────────────────────────────────
  ...createInitialRunState(),
  phase: "menu",
  hasSeenIntro: false,
  hasMetMerchant: false,
  hasSprinted: false,
  ownedSkins: new Set<SkinId>(),
  equippedSkin: null,
  skinPurchaseError: null,
  ownedRelics: [],
  isMintingReward: false,

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

  openShop: () => set({ shopOpen: true, phase: "shop" }),
  closeShop: () => set({ shopOpen: false, phase: "exploring" }),

  claimFinale: () => set({ finaleClaimed: true }),

  setHasSeenIntro: () => set({ hasSeenIntro: true }),
  setHasMetMerchant: () => set({ hasMetMerchant: true }),
  setHasSprinted: () => set({ hasSprinted: true }),

  buySkin: async (skinId, playerAddress) => {
    set({ skinPurchaseError: null });
    try {
      // Step 1: challenge — expect a 402 with x402 payment requirements.
      const challenge = await fetch("/api/merchant/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinId, playerAddress }),
      });

      if (challenge.status !== 402) {
        const data = await parseJsonSafe(challenge);
        throw new Error(data.error ?? "Unexpected checkout response");
      }

      // Step 2: settle. TODO: sign the returned `accepts` requirement with
      // the player's wallet instead of this placeholder header — see
      // checkout.ts's "Known gap" note (x402 has no native-ETH scheme
      // without a facilitator service to verify against).
      const settle = await fetch("/api/merchant/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": "placeholder-payment-authorization",
        },
        body: JSON.stringify({ skinId, playerAddress }),
      });
      const data = await parseJsonSafe(settle);
      if (!settle.ok || !data.success) throw new Error(data.error ?? "Checkout failed");

      set((s) => ({ ownedSkins: new Set(s.ownedSkins).add(skinId) }));
      return true;
    } catch (err) {
      set({ skinPurchaseError: err instanceof Error ? err.message : "Purchase failed" });
      return false;
    }
  },

  equipSkin: (skinId) =>
    set((s) => (s.ownedSkins.has(skinId) ? { equippedSkin: skinId } : s)),

  mintPuzzleReward: async (puzzleId, playerAddress) => {
    const relic = PUZZLE_RELICS[puzzleId];
    if (!relic || !playerAddress) return;
    // Already minted this run (or from a previous session, if this were
    // persisted) — don't re-mint.
    if (get().ownedRelics.some((r) => r.puzzleId === puzzleId)) return;

    set({ isMintingReward: true });
    try {
      const tokenURI = `${window.location.origin}${relic.tokenURI}`;
      const res = await fetch("/api/rewards/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId, playerAddress, tokenURI }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok || !data.success) throw new Error(data.error ?? "Mint failed");

      set((s) => ({
        ownedRelics: [
          ...s.ownedRelics,
          { puzzleId, name: relic.name, image: relic.image, txHash: data.txHash ?? null },
        ],
      }));
    } catch (err) {
      // Best-effort — see the doc comment on this action above.
      console.error("[gameStore] mintPuzzleReward failed:", err);
    } finally {
      set({ isMintingReward: false });
    }
  },

  restartRun: () =>
    set((s) => ({
      ...createInitialRunState(),
      phase: "exploring",
      hasSeenIntro: s.hasSeenIntro,
      hasMetMerchant: s.hasMetMerchant,
      hasSprinted: s.hasSprinted,
    })),
}));
