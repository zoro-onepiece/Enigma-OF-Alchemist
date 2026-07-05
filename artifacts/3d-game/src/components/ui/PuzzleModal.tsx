/**
 * PuzzleModal
 *
 * DOM overlay that appears when the player activates a rune puzzle
 * (GlowingPuzzle → gameStore.openPuzzle → phase='puzzle'). Presents a
 * rune-sequence memory challenge: a fixed 4-step target sequence — derived
 * deterministically from the puzzle's id, so every puzzle has its own
 * distinct sequence but replays are consistent — flashes once, then the
 * player must reproduce it by clicking the 4 rune buttons in order.
 *
 * On a full correct match, calls the store's solvePuzzle(puzzleId) (which
 * also awards +100 score) and shows a brief success state before closing.
 * A wrong click shakes/flashes red, then replays the sequence; retries are
 * unlimited.
 *
 * This is a plain DOM overlay (not part of the R3F scene graph), and never
 * touches Player.tsx — it just calls back into gameStore via props.
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface PuzzleModalProps {
  puzzleId: string;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
}

type UiPhase = "flashing" | "input" | "wrong" | "success";

const RUNES: { id: number; label: string; color: string; glow: string }[] = [
  { id: 0, label: "Ember", color: "#f59e0b", glow: "rgba(245,158,11,0.65)" },
  { id: 1, label: "Verdant", color: "#10b981", glow: "rgba(16,185,129,0.65)" },
  { id: 2, label: "Void", color: "#a78bfa", glow: "rgba(167,139,250,0.65)" },
  { id: 3, label: "Blood", color: "#f43f5e", glow: "rgba(244,63,94,0.65)" },
];

const SEQUENCE_LENGTH = 4;
const FLASH_INTERVAL_MS = 600;

// Deterministic per-id sequence so each of the 4 puzzles always presents the
// same challenge, but different puzzles get different sequences.
function hashStringToSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getTargetSequence(puzzleId: string): number[] {
  const rand = mulberry32(hashStringToSeed(puzzleId));
  return Array.from({ length: SEQUENCE_LENGTH }, () =>
    Math.floor(rand() * RUNES.length),
  );
}

export default function PuzzleModal({ puzzleId, onClose, onSolved }: PuzzleModalProps) {
  const targetSequence = useMemo(() => getTargetSequence(puzzleId), [puzzleId]);
  const [uiPhase, setUiPhase] = useState<UiPhase>("flashing");
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const playFlashSequence = () => {
    clearTimers();
    setUserInput([]);
    setUiPhase("flashing");
    targetSequence.forEach((runeId, i) => {
      timeouts.current.push(
        setTimeout(() => setFlashIndex(runeId), i * FLASH_INTERVAL_MS),
      );
      timeouts.current.push(
        setTimeout(() => setFlashIndex(null), i * FLASH_INTERVAL_MS + FLASH_INTERVAL_MS * 0.6),
      );
    });
    timeouts.current.push(
      setTimeout(() => setUiPhase("input"), targetSequence.length * FLASH_INTERVAL_MS),
    );
  };

  useEffect(() => {
    playFlashSequence();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId]);

  const handleRuneClick = (runeId: number) => {
    if (uiPhase !== "input") return;

    const nextInput = [...userInput, runeId];
    const stepIndex = nextInput.length - 1;

    if (targetSequence[stepIndex] !== runeId) {
      setUiPhase("wrong");
      clearTimers();
      timeouts.current.push(setTimeout(() => playFlashSequence(), 900));
      return;
    }

    setUserInput(nextInput);

    if (nextInput.length === targetSequence.length) {
      setUiPhase("success");
      clearTimers();
      onSolved(puzzleId);
      timeouts.current.push(setTimeout(() => onClose(), 1400));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      tabIndex={-1}
    >
      <style>{`
        @keyframes puzzle-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>

      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border-2 border-amber-700/60 bg-gradient-to-b from-stone-900 to-stone-950 p-8 shadow-2xl shadow-black/60 font-serif"
        style={uiPhase === "wrong" ? { animation: "puzzle-shake 0.4s ease-in-out" } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-amber-400 font-semibold text-lg tracking-wide">
            Rune Sigil — Awaken the Essence
          </h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {uiPhase === "success" ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-emerald-400 font-semibold text-lg">
              An Essence awakens ✨
            </p>
          </div>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-6 text-center italic">
              {uiPhase === "flashing"
                ? "Watch the sigil sequence carefully…"
                : uiPhase === "wrong"
                  ? "The wards reject you — the sequence repeats."
                  : "Repeat the sequence, in order."}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {targetSequence.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i < userInput.length ? "bg-emerald-400" : "bg-white/15"
                  }`}
                />
              ))}
            </div>

            {/* Rune buttons */}
            <div className="grid grid-cols-4 gap-4">
              {RUNES.map((rune) => {
                const isFlashing = uiPhase === "flashing" && flashIndex === rune.id;
                return (
                  <button
                    key={rune.id}
                    onClick={() => handleRuneClick(rune.id)}
                    disabled={uiPhase !== "input"}
                    className="flex flex-col items-center gap-2 rounded-xl border py-4 transition-all disabled:cursor-not-allowed"
                    style={{
                      borderColor: isFlashing ? rune.color : "rgba(255,255,255,0.12)",
                      backgroundColor: isFlashing ? `${rune.color}33` : "rgba(255,255,255,0.03)",
                      boxShadow: isFlashing ? `0 0 18px ${rune.glow}` : "none",
                    }}
                  >
                    <span
                      className="h-8 w-8 rounded-full border-2"
                      style={{
                        backgroundColor: rune.color,
                        borderColor: rune.color,
                        boxShadow: isFlashing ? `0 0 14px ${rune.glow}` : `0 0 6px ${rune.glow}`,
                        opacity: isFlashing ? 1 : 0.85,
                      }}
                    />
                    <span className="text-[10px] uppercase tracking-wide text-white/50">
                      {rune.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
