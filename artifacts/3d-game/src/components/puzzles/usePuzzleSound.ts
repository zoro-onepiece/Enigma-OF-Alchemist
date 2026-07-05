/**
 * usePuzzleSound — shared Web Audio API sound-effect helper for the
 * Rune Memory, Alchemy Match-3, and Sigil Pairs mini-games.
 *
 * Synthesizes tones with oscillators rather than shipping audio files, so no
 * new assets or dependencies are required. Mirrors the approach used by
 * RunicLights' own `useRunicSound` hook, generalized with a few more cue
 * types (flip, match, wrong, lose) needed by the other games.
 */
import { useCallback, useRef } from "react";

type ToneOptions = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
};

export function usePuzzleSound() {
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

  const playClick = useCallback(
    (pitchIndex = 0) => {
      playTone({ frequency: 440 + pitchIndex * 60, duration: 0.12, type: "triangle", volume: 0.1 });
    },
    [playTone],
  );

  const playFlip = useCallback(() => {
    playTone({ frequency: 380, duration: 0.1, type: "square", volume: 0.07 });
  }, [playTone]);

  const playMatch = useCallback(() => {
    playTone({ frequency: 660, duration: 0.16, type: "sine", volume: 0.13 });
    playTone({ frequency: 880, duration: 0.18, type: "sine", volume: 0.12, delay: 0.08 });
  }, [playTone]);

  const playWrong = useCallback(() => {
    playTone({ frequency: 180, duration: 0.22, type: "sawtooth", volume: 0.1 });
  }, [playTone]);

  const playWin = useCallback(() => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      playTone({ frequency, duration: 0.3, type: "sine", volume: 0.14, delay: i * 0.09 });
    });
  }, [playTone]);

  const playLose = useCallback(() => {
    const notes = [392, 329.63, 261.63];
    notes.forEach((frequency, i) => {
      playTone({ frequency, duration: 0.35, type: "sine", volume: 0.12, delay: i * 0.12 });
    });
  }, [playTone]);

  return { playClick, playFlip, playMatch, playWrong, playWin, playLose };
}
