/**
 * IdleReminder
 *
 * Plays idle_reminder.mp3 if the player has taken no movement/interaction
 * input for a while during *active* gameplay — not while a puzzle modal,
 * the map, or any other overlay is up (gameStore.phase !== 'exploring').
 * Won't repeat again for several minutes even if idling continues, so it
 * doesn't spam a player who's genuinely away from the keyboard.
 *
 * Mounted as a sibling of SprintFootstepSound in Scene.tsx — plain DOM-side
 * component, no R3F/useFrame needed.
 */
import { useEffect, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import { playVoiceLine } from "../../audio/voice";

// 30-45s idle window requested — 35s is the midpoint.
const IDLE_THRESHOLD_MS = 35000;
// Cooldown before the reminder can fire again if idling continues.
const REPEAT_COOLDOWN_MS = 3 * 60 * 1000;
const CHECK_INTERVAL_MS = 2000;

export default function IdleReminder() {
  const lastActivityRef = useRef(Date.now());
  const lastFiredAtRef = useRef<number | null>(null);

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const phase = useGameStore.getState().phase;
      if (phase !== "exploring") {
        // Time spent in a puzzle/menu/dead doesn't count as idle — without
        // this, returning from a long puzzle would immediately look like
        // "idle the whole time" and fire the instant exploring resumes.
        lastActivityRef.current = Date.now();
        return;
      }

      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < IDLE_THRESHOLD_MS) return;

      const now = Date.now();
      if (
        lastFiredAtRef.current !== null &&
        now - lastFiredAtRef.current < REPEAT_COOLDOWN_MS
      ) {
        return;
      }
      lastFiredAtRef.current = now;
      playVoiceLine(
        "idle_reminder",
        "Still there? The garden isn't going to explore itself.",
      );
    }, CHECK_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
