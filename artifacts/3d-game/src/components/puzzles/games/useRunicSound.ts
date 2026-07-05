/**
 * useRunicSound — tiny Web Audio API sound-effect helper for RunicLights.
 *
 * Scoped to this game only (per the "don't touch other games/framework"
 * constraint). Sounds are synthesized with oscillators rather than shipped
 * as audio files, so no new assets or dependencies are required.
 */
import { useCallback, useRef } from "react";
import { useSoundStore } from "../../../store/soundStore";

type ToneOptions = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
};

export function useRunicSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const playTone = useCallback(
    ({ frequency, duration, type = "sine", volume = 0.15, delay = 0 }: ToneOptions) => {
      if (useSoundStore.getState().muted) return;
      const ctx = getContext();
      if (!ctx) return;

      const startTime = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.02);
    },
    [getContext],
  );

  const playToggle = useCallback(
    (litAfterToggle: boolean) => {
      playTone({
        frequency: litAfterToggle ? 520 : 300,
        duration: 0.14,
        type: "triangle",
        volume: 0.12,
      });
    },
    [playTone],
  );

  const playWin = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      playTone({ frequency, duration: 0.3, type: "sine", volume: 0.14, delay: i * 0.09 });
    });
  }, [playTone]);

  const playHint = useCallback(() => {
    playTone({ frequency: 220, duration: 0.25, type: "sine", volume: 0.08 });
  }, [playTone]);

  return { playToggle, playWin, playHint };
}
