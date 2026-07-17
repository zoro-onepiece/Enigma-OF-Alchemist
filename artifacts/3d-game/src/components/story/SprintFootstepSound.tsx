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
 * Replaces the old continuous breath.mp3 loop (formerly SprintBreathSound)
 * with discrete, rhythmically-timed plays — playSfx() already clones a
 * cached element per call and cleans up on "ended", so overlapping
 * footsteps never garble each other the way a single re-triggered element
 * would.
 */
import { useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { PlayerControl } from "../3d/Player";
import { playSfx } from "../../audio/sounds";

const FOOTSTEP_INTERVAL_MS = 325;
const FOOTSTEP_VOLUME = 0.5;

export default function SprintFootstepSound() {
  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const start = () => {
      if (intervalRef.current !== null) return; // already running
      playSfx("footstep", FOOTSTEP_VOLUME);
      intervalRef.current = window.setInterval(() => {
        playSfx("footstep", FOOTSTEP_VOLUME);
      }, FOOTSTEP_INTERVAL_MS);
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
