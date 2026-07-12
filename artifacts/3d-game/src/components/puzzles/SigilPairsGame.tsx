/**
 * SigilPairsGame — Phase 3d
 *
 * Classic memory-match: 12 face-down cards (6 alchemical symbol pairs) in
 * a 4x3 grid. Two flipped cards that match stay revealed; a mismatch flips
 * back after 800ms. Winning requires finding all 6 pairs within 20 flips;
 * going over the limit reshuffles the board for a fresh retry.
 */
import { useState } from "react";
import { usePuzzleSound } from "./usePuzzleSound";

interface SigilPairsGameProps {
  onWin: () => void;
  onLose?: () => void;
}

const SYMBOLS = ["🜁", "🜂", "🜃", "🜄", "🜚", "☿"];
const MAX_FLIPS = 20;

interface Card {
  id: number;
  symbol: string;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeDeck(): Card[] {
  const pairSymbols = shuffle([...SYMBOLS, ...SYMBOLS]);
  return pairSymbols.map((symbol, id) => ({ id, symbol, matched: false }));
}

export default function SigilPairsGame({ onWin, onLose }: SigilPairsGameProps) {
  const [cards, setCards] = useState<Card[]>(() => makeDeck());
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [flipsUsed, setFlipsUsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const { playFlip, playMatch, playWrong, playWin } = usePuzzleSound();

  // Hitting the flip limit is this game's fail/retry transition — like
  // Alchemy Match-3 running out of moves, it discards all progress
  // (matched pairs included) and starts over on a fresh board. A single
  // mismatch just flips two cards back with no cost, same as Match-3's
  // freely-reverted invalid swap — only the "attempt failed" reshuffle
  // costs HP.
  const reshuffle = () => {
    onLose?.();
    setCards(makeDeck());
    setFlippedIds([]);
    setFlipsUsed(0);
    setBusy(false);
  };

  const handleCardClick = (id: number) => {
    if (busy) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.matched || flippedIds.includes(id)) return;
    if (flippedIds.length === 2) return;

    playFlip();
    const nextFlips = flipsUsed + 1;
    setFlipsUsed(nextFlips);

    const nextFlippedIds = [...flippedIds, id];
    setFlippedIds(nextFlippedIds);

    if (nextFlippedIds.length === 2) {
      setBusy(true);
      const [firstId, secondId] = nextFlippedIds;
      const first = cards.find((c) => c.id === firstId)!;
      const second = cards.find((c) => c.id === secondId)!;

      if (first.symbol === second.symbol) {
        playMatch();
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c)),
          );
          setFlippedIds([]);
          setBusy(false);
          setCards((prev) => {
            const allMatched = prev.every(
              (c) => c.matched || c.id === firstId || c.id === secondId,
            );
            if (allMatched) {
              setTimeout(() => {
                playWin();
                onWin();
              }, 200);
            }
            return prev;
          });
        }, 350);
      } else {
        playWrong();
        setTimeout(() => {
          setFlippedIds([]);
          setBusy(false);
          if (nextFlips >= MAX_FLIPS) {
            reshuffle();
          }
        }, 800);
      }
    } else if (nextFlips >= MAX_FLIPS) {
      // Hit the limit on a single flip (rare edge case) — let the pending
      // reveal resolve visually, then reshuffle.
      setTimeout(() => reshuffle(), 850);
    }
  };

  return (
    <div>
      <p className="text-white/60 text-sm mb-3 text-center italic">
        Find all 6 matching sigil pairs.
      </p>

      <div className="flex items-center justify-center text-[11px] uppercase tracking-[0.2em] text-amber-300/80 mb-4">
        Flips used: {flipsUsed} / {MAX_FLIPS}
      </div>

      <div className="grid grid-cols-4 gap-2 mx-auto" style={{ maxWidth: 320 }}>
        {cards.map((card) => {
          const faceUp = card.matched || flippedIds.includes(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={busy && !faceUp}
              className="aspect-square flex items-center justify-center rounded-lg border text-xl transition-all"
              style={{
                borderColor: card.matched
                  ? "#facc15"
                  : faceUp
                    ? "#a78bfa"
                    : "rgba(255,255,255,0.15)",
                backgroundColor: card.matched
                  ? "rgba(250,204,21,0.15)"
                  : faceUp
                    ? "rgba(167,139,250,0.15)"
                    : "rgba(255,255,255,0.04)",
              }}
            >
              {faceUp ? card.symbol : <span className="text-stone-600 text-sm">✦</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
