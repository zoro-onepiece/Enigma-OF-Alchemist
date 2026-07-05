/**
 * RuneMemoryGame — Phase 3a
 *
 * Simon Says style memory game. 4 colored runes flash a sequence; the
 * player reproduces it by clicking. Sequence starts at length 3 and grows
 * by 1 each round; winning 3 rounds in a row completes the puzzle. A wrong
 * click shakes red and replays the same sequence — retries are unlimited.
 */
import { useEffect, useRef, useState } from "react";

interface RuneMemoryGameProps {
  onWin: () => void;
}

type UiPhase = "flashing" | "input" | "wrong";

const RUNES: { id: number; label: string; color: string; glow: string }[] = [
  { id: 0, label: "Ember", color: "#f59e0b", glow: "rgba(245,158,11,0.65)" },
  { id: 1, label: "Verdant", color: "#10b981", glow: "rgba(16,185,129,0.65)" },
  { id: 2, label: "Void", color: "#a78bfa", glow: "rgba(167,139,250,0.65)" },
  { id: 3, label: "Blood", color: "#f43f5e", glow: "rgba(244,63,94,0.65)" },
];

const TOTAL_ROUNDS = 3;
const START_LENGTH = 3;
const FLASH_INTERVAL_MS = 600;

function randomSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * RUNES.length));
}

export default function RuneMemoryGame({ onWin }: RuneMemoryGameProps) {
  const [round, setRound] = useState(1);
  const [sequence, setSequence] = useState<number[]>(() => randomSequence(START_LENGTH));
  const [uiPhase, setUiPhase] = useState<UiPhase>("flashing");
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [userInput, setUserInput] = useState<number[]>([]);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const playFlashSequence = (seq: number[]) => {
    clearTimers();
    setUserInput([]);
    setUiPhase("flashing");
    seq.forEach((runeId, i) => {
      timeouts.current.push(setTimeout(() => setFlashIndex(runeId), i * FLASH_INTERVAL_MS));
      timeouts.current.push(
        setTimeout(() => setFlashIndex(null), i * FLASH_INTERVAL_MS + FLASH_INTERVAL_MS * 0.6),
      );
    });
    timeouts.current.push(setTimeout(() => setUiPhase("input"), seq.length * FLASH_INTERVAL_MS));
  };

  useEffect(() => {
    playFlashSequence(sequence);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const handleRuneClick = (runeId: number) => {
    if (uiPhase !== "input") return;

    const nextInput = [...userInput, runeId];
    const stepIndex = nextInput.length - 1;

    if (sequence[stepIndex] !== runeId) {
      setUiPhase("wrong");
      clearTimers();
      timeouts.current.push(setTimeout(() => playFlashSequence(sequence), 900));
      return;
    }

    setUserInput(nextInput);

    if (nextInput.length === sequence.length) {
      clearTimers();
      if (round >= TOTAL_ROUNDS) {
        onWin();
        return;
      }
      timeouts.current.push(
        setTimeout(() => {
          const nextSeq = randomSequence(START_LENGTH + round);
          setSequence(nextSeq);
          setRound((r) => r + 1);
        }, 700),
      );
    }
  };

  return (
    <div style={uiPhase === "wrong" ? { animation: "puzzle-shake 0.4s ease-in-out" } : undefined}>
      <p className="text-white/60 text-sm mb-4 text-center italic">
        {uiPhase === "flashing"
          ? "Watch the sigil sequence carefully…"
          : uiPhase === "wrong"
            ? "The wards reject you — the sequence repeats."
            : "Repeat the sequence, in order."}
      </p>

      <p className="text-center text-[11px] uppercase tracking-[0.3em] text-amber-400/70 mb-4">
        Round {round} / {TOTAL_ROUNDS}
      </p>

      <div className="flex items-center justify-center gap-2 mb-6">
        {sequence.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i < userInput.length ? "bg-emerald-400" : "bg-white/15"
            }`}
          />
        ))}
      </div>

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
              <span className="text-[10px] uppercase tracking-wide text-white/50">{rune.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
