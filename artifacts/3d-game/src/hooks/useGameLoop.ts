/**
 * useGameLoop
 *
 * Provides a stable subscription to the R3F render loop from outside <Canvas>.
 * Use inside Canvas children via useFrame() directly instead.
 *
 * This hook is for synchronising DOM state (HUD) to game state without
 * triggering excessive re-renders by reading from the Zustand store.
 */
import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

/**
 * Returns a function to manually trigger a game tick from tests or story events.
 * In normal gameplay, state flows from useFrame() → gameStore → HUD.
 */
export function useGameLoop() {
  const { setGameState } = useGameStore();

  useEffect(() => {
    // TODO: connect to R3F's addAfterEffect / addEffect for DOM sync
    // Placeholder: game loop driven entirely by R3F useFrame inside Canvas
  }, [setGameState]);
}
