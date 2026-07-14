/**
 * SubtitleBar
 *
 * Bottom-center overlay showing whatever line voice.ts is currently
 * speaking (Web Speech API), fading in/out as speech starts/stops. Renders
 * nothing (fully transparent, no box) when nothing is being spoken —
 * including on browsers without speechSynthesis support, since
 * getCurrentSpeechText() just stays null there forever.
 *
 * z-[58] sits above MobileControls' action button (z-[55]) but below every
 * modal overlay (PuzzleModal/FinaleOverlay/GameOverOverlay/IntroStory all
 * z-[100] or higher) and doesn't intercept pointer events.
 */
import { useSyncExternalStore } from "react";
import { getCurrentSpeechText, subscribeSpeech } from "../../audio/voice";

function getServerSnapshot(): string | null {
  return null;
}

export default function SubtitleBar() {
  const text = useSyncExternalStore(
    subscribeSpeech,
    getCurrentSpeechText,
    getServerSnapshot,
  );

  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 bottom-28 z-[58] flex justify-center px-4 transition-opacity duration-300 sm:bottom-10",
        text ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-live="polite"
    >
      {text && (
        <p className="max-w-xl rounded-lg border border-amber-500/20 bg-black/70 px-4 py-2 text-center font-serif text-sm text-amber-50 shadow-lg backdrop-blur-sm sm:text-base">
          {text}
        </p>
      )}
    </div>
  );
}
