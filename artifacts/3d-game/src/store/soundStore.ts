/**
 * soundStore
 *
 * Tiny persisted Zustand store holding a single global mute flag for the
 * synthesized puzzle sound effects (RunicLights' useRunicSound and the
 * shared usePuzzleSound hook used by the other 3 mini-games). Persisted to
 * localStorage so the player's preference survives a reload.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundStore {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    (set) => ({
      muted: false,
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setMuted: (muted) => set({ muted }),
    }),
    { name: "enigma-sound-settings" },
  ),
);
