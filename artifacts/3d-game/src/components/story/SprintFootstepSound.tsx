/**
 * SprintFootstepSound
 *
 * Surrounding sound-trigger for Player.tsx's existing sprint detection —
 * does not modify Player.tsx's movement/speed logic at all. Reads the same
 * keyboard-controls state Player.tsx reads (drei's KeyboardControls context,
 * shared via playerKeyboardMap) from a separate component, and plays
 * footstep.mp3 on a running cadence whenever sprint (Shift) is actually
 * active (held AND moving), mirroring Player.tsx's own `moving && sprint`
 * check used for its walk/run animation crossfade.
 *
 * ── Root cause of the 2-3s trailing sound after releasing Shift ─────────
 * footstep.mp3 is ~1s long (measured directly from its MP3 frame headers),
 * noticeably longer than the 325ms trigger interval — so at steady state
 * ~3 copies are playing at once, staggered. The previous version played
 * each copy via sounds.ts's playSfx(), which is deliberately fire-and-
 * forget (clones an element, plays it, lets it finish on its own — correct
 * for one-shot SFX like chime/victory/click, which SHOULD always finish).
 * stop() only ever cleared the *interval* scheduling new copies; it had no
 * handle on copies already in flight, so whichever ~3 were mid-playback
 * when Shift was released just kept going until each finished naturally —
 * that's the lingering tail, not a debounce or timeout anywhere.
 *
 * Fix: this component now manages its own small fixed pool of Audio
 * elements directly (bypassing playSfx only for this one sound), so stop()
 * can call .pause() on every pool element immediately instead of waiting
 * for them to finish. Scoped to this file only — sounds.ts's playSfx and
 * its shared activeSfxNodes tracking for other SFX (click/chime/victory)
 * are untouched.
 */
import { useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { PlayerControl } from "../3d/Player";
import { audioFileExists } from "../../audio/sounds";
import { useSoundStore } from "../../store/soundStore";
import { useGameStore } from "../../store/gameStore";
import { playVoiceLine } from "../../audio/voice";

const FOOTSTEP_INTERVAL_MS = 325;
const FOOTSTEP_VOLUME = 0.5;
const FOOTSTEP_PATH = "/audio/footstep.mp3";
// ~1s clip / 325ms interval ≈ 3 overlapping copies at steady state; 4 gives
// a little headroom without over-allocating.
const POOL_SIZE = 4;

export default function SprintFootstepSound() {
  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();
  const intervalRef = useRef<number | null>(null);
  const poolRef = useRef<HTMLAudioElement[] | null>(null);
  const poolIndexRef = useRef(0);
  const availableRef = useRef(false);

  // Build the pool once, only after confirming the file exists (same
  // never-hit-a-raw-404 discipline sounds.ts's playSfx follows).
  useEffect(() => {
    let cancelled = false;
    audioFileExists(FOOTSTEP_PATH).then((ok) => {
      if (cancelled || !ok) return;
      availableRef.current = true;
      poolRef.current = Array.from({ length: POOL_SIZE }, () => {
        const el = new Audio(FOOTSTEP_PATH);
        el.volume = FOOTSTEP_VOLUME;
        el.muted = useSoundStore.getState().muted;
        return el;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the pool's mute state in sync with the shared toggle, same as
  // sounds.ts's own elements.
  useEffect(() => {
    return useSoundStore.subscribe((s) => {
      poolRef.current?.forEach((el) => {
        el.muted = s.muted;
      });
    });
  }, []);

  useEffect(() => {
    const playOne = () => {
      const pool = poolRef.current;
      if (!pool || !availableRef.current) return;
      if (useSoundStore.getState().muted) return;
      const el = pool[poolIndexRef.current];
      poolIndexRef.current = (poolIndexRef.current + 1) % pool.length;
      el.currentTime = 0;
      el.play().catch(() => {});
    };

    const stop = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // The actual fix: silence every in-flight copy immediately instead
      // of only stopping future ones from being scheduled.
      poolRef.current?.forEach((el) => {
        el.pause();
        el.currentTime = 0;
      });
    };

    const start = () => {
      if (intervalRef.current !== null) return; // already running
      if (!useGameStore.getState().hasSprinted) {
        useGameStore.getState().setHasSprinted();
        playVoiceLine(
          "sprint_first_time",
          "Ha! Feel that rush? Sprinting will get you there faster.",
          { priority: true },
        );
      }
      playOne();
      intervalRef.current = window.setInterval(playOne, FOOTSTEP_INTERVAL_MS);
    };

    const evaluate = () => {
      const { forward, backward, left, right, sprint } = getKeys();
      const moving = forward || backward || left || right;
      if (sprint && moving) {
        start();
      } else {
        stop();
      }
    };

    const unsubscribe = subscribeKeys(
      (state) =>
        `${state.sprint}|${state.forward}|${state.backward}|${state.left}|${state.right}`,
      evaluate,
    );

    return () => {
      unsubscribe();
      stop();
    };
  }, [subscribeKeys, getKeys]);

  return null;
}
