/**
 * FinaleOverlay
 *
 * Full-screen DOM overlay (Task 3c) shown once the player claims the
 * finale treasure chest. Kept as a standalone component (like
 * AudioMuteToggle) rather than folded into GameHUD.jsx, since the "don't
 * touch GameHUD internals" rule still applies. Fires `onEnigmaComplete`
 * once on mount (defaults to a console.log if the host app doesn't pass
 * one), and includes a lightweight CSS-only sparkle burst — no canvas/
 * particle libraries needed for a one-shot DOM effect.
 */
import { useEffect, useMemo } from "react";

export interface FinaleOverlayProps {
  score: number;
  essences: number;
  onEnigmaComplete?: (payload: { score: number; essences: number }) => void;
  onDismiss?: () => void;
}

export default function FinaleOverlay({
  score,
  essences,
  onEnigmaComplete,
  onDismiss,
}: FinaleOverlayProps) {
  useEffect(() => {
    if (onEnigmaComplete) {
      onEnigmaComplete({ score, essences });
    } else {
      // eslint-disable-next-line no-console
      console.log("[Finale] onEnigmaComplete:", { score, essences });
    }
    // Only fire once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const burstParticles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const distance = 90 + Math.random() * 70;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          delay: Math.random() * 0.4,
        };
      }),
    [],
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        {burstParticles.map((p, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-amber-300 finale-spark"
            style={
              {
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-4 max-w-lg rounded-2xl border-2 border-amber-400/70 bg-gradient-to-b from-stone-900 to-emerald-950 p-5 text-center shadow-[0_0_60px_rgba(251,191,36,0.35)] sm:p-8">
        <div className="mb-2 text-4xl sm:mb-3 sm:text-5xl">🏆</div>
        <h1 className="mb-2 text-lg font-bold tracking-wide text-amber-200 sm:text-xl">
          The Enigma is Solved!
        </h1>
        <p className="mb-4 text-xs text-amber-100/80 sm:mb-6 sm:text-sm">All Essences United</p>

        <div
          className="mb-4 space-y-2.5 text-sm leading-relaxed text-amber-100/95 sm:mb-6 sm:space-y-3 sm:text-base md:text-lg"
          style={{ animation: "finale-reveal-fade 1.4s ease-out" }}
        >
          <p>
            The shrines never sought a stranger. They sought an heir.
          </p>
          <p>
            As the final seal breaks, the island remembers what it always knew —{" "}
            <span className="font-semibold text-amber-300">you are her.</span>
          </p>
          <p className="font-semibold text-amber-200">
            The Legendary Alchemist has returned, and the garden is yours once more.
          </p>
        </div>

        <div className="mb-4 flex justify-center gap-4 sm:mb-6 sm:gap-8">
          <div>
            <div className="text-xl font-bold text-amber-300 sm:text-2xl">{essences}/4</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40 sm:text-[10px]">Essences</div>
          </div>
          <div>
            <div className="text-xl font-bold text-amber-300 sm:text-2xl">{score}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/40 sm:text-[10px]">Score</div>
          </div>
        </div>

        <div className="mb-4 inline-block rounded-lg border border-amber-400/40 bg-amber-500/5 px-3 py-1.5 text-[10px] uppercase tracking-widest text-amber-300/90 sm:mb-6 sm:px-4 sm:py-2 sm:text-[11px]">
          Reward: Legendary Alchemist — Verified
        </div>

        {onDismiss && (
          <div>
            <button
              onClick={onDismiss}
              className="min-h-11 rounded-lg border border-amber-400/60 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              Continue
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes finale-spark-fly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% {
            transform: translate(var(--dx), var(--dy)) scale(0.2);
            opacity: 0;
          }
        }
        .finale-spark {
          animation: finale-spark-fly 1.1s ease-out forwards;
        }
        @keyframes finale-reveal-fade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
