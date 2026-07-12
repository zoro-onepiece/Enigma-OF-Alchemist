/**
 * SprintBreathSound
 *
 * Surrounding sound-trigger for Player.tsx's existing sprint detection —
 * does not modify Player.tsx's movement/speed logic at all. Reads the same
 * keyboard-controls state Player.tsx reads (drei's KeyboardControls context,
 * shared via playerKeyboardMap) from a separate component, and starts/stops
 * the looping breath.mp3 sound whenever sprint (Shift) is actually active
 * (held AND moving), mirroring Player.tsx's own `moving && sprint` check
 * used for its walk/run animation crossfade.
 */
import { useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { PlayerControl } from "../3d/Player";
import { startBreathSound, stopBreathSound } from "../../audio/sounds";

export default function SprintBreathSound() {
  const [subscribeKeys, getKeys] = useKeyboardControls<PlayerControl>();

  useEffect(() => {
    const evaluate = () => {
      const { forward, backward, left, right, sprint } = getKeys();
      const moving = forward || backward || left || right;
      if (sprint && moving) {
        startBreathSound();
      } else {
        stopBreathSound();
      }
    };

    const unsubscribe = subscribeKeys(
      (state) => `${state.sprint}|${state.forward}|${state.backward}|${state.left}|${state.right}`,
      evaluate,
    );

    return () => {
      unsubscribe();
      stopBreathSound();
    };
  }, [subscribeKeys, getKeys]);

  return null;
}
