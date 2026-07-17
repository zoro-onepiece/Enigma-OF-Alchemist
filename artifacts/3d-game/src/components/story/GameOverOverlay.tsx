/**
 * GameOverOverlay
 *
 * Full-screen overlay shown when gameStore.phase === 'dead' (playerHp hit
 * 0). Modeled after FinaleOverlay.tsx's dark stone/amber/emerald treatment,
 * with a somber red-tinted border/glow to distinguish "you died" from "you
 * won." "Try Again" is wired by the caller (Scene.tsx) to both
 * gameStore.restartRun() and Player.tsx's teleportPlayerToSpawn() (and
 * plays tryagain_line — see Scene.tsx's handleRestart).
 */
import { useEffect } from "react";
import { playVoiceLine } from "../../audio/voice";

export interface GameOverOverlayProps {
  score: number;
  onRestart: () => void;
}

export default function GameOverOverlay({ score, onRestart }: GameOverOverlayProps) {
  // Fires once on mount, same "onEnigmaComplete on mount" pattern
  // FinaleOverlay.tsx uses for its own closing line.
  useEffect(() => {
    playVoiceLine(
      "gameover_line",
      "The garden claims another... but this isn't truly the end.",
      { priority: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm font-serif">
      <div className="relative mx-4 max-w-lg rounded-2xl border-2 border-red-900/70 bg-gradient-to-b from-stone-900 to-emerald-950 p-5 text-center shadow-[0_0_60px_rgba(127,29,29,0.4)] sm:p-8">
        <div className="mb-2 text-4xl sm:mb-3 sm:text-5xl">💀</div>
        <h1 className="mb-2 text-lg font-bold tracking-wide text-amber-200 sm:text-xl">
          Your Journey Ends Here
        </h1>
        <p className="mb-4 text-xs leading-relaxed text-amber-100/80 sm:mb-6 sm:text-sm">
          Your vitality has been consumed by the trials... The garden claims
          you — but legends are given second chances.
        </p>

        <div className="mb-4 flex justify-center sm:mb-6">
          <div>
            <div className="text-xl font-bold text-amber-300 sm:text-2xl">{score}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40 sm:text-[10px]">Arcana</div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="min-h-11 rounded-lg border border-amber-400/60 bg-amber-500/10 px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-amber-200 transition-colors hover:bg-amber-500/20"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
