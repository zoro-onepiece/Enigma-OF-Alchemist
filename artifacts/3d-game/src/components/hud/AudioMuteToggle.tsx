/**
 * AudioMuteToggle
 *
 * Standalone corner mute/unmute button for the new music + SFX audio
 * module (src/audio/sounds.ts). Intentionally kept OUTSIDE GameHUD.jsx as
 * its own tiny component per the "don't touch GameHUD internals" rule —
 * it reads/writes the same shared `useSoundStore` mute flag that
 * GameHUD's existing speaker button and the puzzle SFX hooks use, so all
 * mute controls in the app always agree with each other.
 */
import { useSoundStore } from "../../store/soundStore";

export default function AudioMuteToggle() {
  const muted = useSoundStore((s) => s.muted);
  const toggleMute = useSoundStore((s) => s.toggleMute);

  return (
    <button
      onClick={toggleMute}
      title={muted ? "Unmute game audio" : "Mute game audio"}
      className="pointer-events-auto absolute left-2 top-2 z-[60] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/50 text-base text-white/90 backdrop-blur-sm transition-all hover:scale-105 hover:bg-black/70 active:scale-95 sm:left-4 sm:top-4"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
