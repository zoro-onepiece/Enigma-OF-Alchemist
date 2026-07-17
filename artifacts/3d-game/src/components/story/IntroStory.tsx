/**
 * IntroStory
 *
 * One-time opening narration shown after login succeeds, before the 3D
 * world (Scene/Canvas) mounts. Styled to match MainMenu/PuzzleModal/
 * FinaleOverlay's dark stone/amber/emerald alchemy theme. Paragraphs
 * advance one at a time via a "Continue" click/tap; a skip button jumps
 * straight to the final "Begin" prompt for anyone who's seen it before.
 */
import { useEffect, useState } from "react";
import { speak, cancelSpeech } from "../../audio/voice";
import SubtitleBar from "./SubtitleBar";
import SpeakingAvatar from "./SpeakingAvatar";

const PARAGRAPHS = [
  "The temple garden was once home to a legendary alchemist — the only being who ever mastered all four elements and conjured the Enigma Elixir, said to grant its bearer true alchemical mastery.",
  "Centuries ago, she vanished, sealing her power into four shrines scattered across the island so that no one unworthy could claim it.",
  "Since then, countless travelers have entered this garden seeking her power. None have ever solved all four seals.",
  "You are the next to try.",
];

export interface IntroStoryProps {
  onBegin: () => void;
}

export default function IntroStory({ onBegin }: IntroStoryProps) {
  const [index, setIndex] = useState(0);
  const isLast = index === PARAGRAPHS.length - 1;

  // Narrate each paragraph as it's revealed. Cleanup cancels the current
  // utterance the instant `index` changes (tap-to-advance early) or the
  // component unmounts (skip / "Begin") — never two paragraphs talking
  // over each other.
  useEffect(() => {
    speak(PARAGRAPHS[index]);
    return () => cancelSpeech();
  }, [index]);

  const advance = () => {
    if (isLast) {
      onBegin();
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-stone-950 via-emerald-950 to-stone-950 font-serif"
      onClick={advance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") advance();
      }}
    >
      {/* Faint alchemy-circle backdrop, matching MainMenu */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <div className="h-[42rem] w-[42rem] rounded-full border-2 border-amber-400" />
        <div className="absolute h-[34rem] w-[34rem] rotate-45 border-2 border-emerald-400" />
        <div className="absolute h-[34rem] w-[34rem] border-2 border-emerald-400" />
      </div>

      {/* Floating ember particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute block h-1 w-1 animate-pulse rounded-full bg-amber-400/60"
            style={{
              left: `${(i * 83) % 100}%`,
              top: `${(i * 37) % 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onBegin();
        }}
        className="absolute right-2 top-2 flex h-11 items-center px-3 text-[9px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:text-amber-300 sm:right-6 sm:top-6 sm:text-[10px] sm:tracking-[0.3em]"
      >
        Skip
      </button>

      <div className="relative flex w-full max-w-2xl flex-col items-center px-5 text-center sm:px-6">
        <span className="mb-4 text-3xl text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.8)] sm:mb-6 sm:text-4xl">
          ⚗️
        </span>

        <p
          key={index}
          className="min-h-[8rem] text-base leading-relaxed text-amber-100/90 sm:min-h-[10rem] sm:text-lg md:text-xl"
          style={{ animation: "intro-fade-in 0.8s ease-out" }}
        >
          {PARAGRAPHS[index]}
        </p>

        <div className="mt-6 flex items-center gap-2 sm:mt-10">
          {PARAGRAPHS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-amber-400" : "bg-stone-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
          className="group relative mt-6 rounded-xl border-2 border-amber-500/90 bg-gradient-to-b from-stone-800 to-emerald-950 px-6 py-3 text-base font-semibold tracking-widest text-amber-100 shadow-[0_0_24px_rgba(217,119,6,0.4)] transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_36px_rgba(251,191,36,0.6)] active:scale-95 sm:mt-8 sm:px-8 sm:py-4 sm:text-lg"
        >
          <span className="flex items-center justify-center gap-3">
            <span className="transition-transform group-hover:rotate-12">🜛</span>
            {isLast ? "Begin" : "Continue"}
          </span>
        </button>
      </div>

      <SubtitleBar />
      <SpeakingAvatar />

      <style>{`
        @keyframes intro-fade-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
