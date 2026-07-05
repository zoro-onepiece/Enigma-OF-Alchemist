/**
 * PotionMixingGame — Phase 3c
 *
 * A recipe scroll gives a riddle-style hint for a fixed 3-ingredient order.
 * The player picks ingredients into 3 cauldron slots and brews; an exact
 * order match wins, a wrong mix triggers a smoke animation, clears the
 * slots, and lets the player retry the same (deterministic) recipe with
 * unlimited attempts.
 */
import { useState } from "react";

interface PotionMixingGameProps {
  onWin: () => void;
}

interface Ingredient {
  id: string;
  label: string;
  emoji: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: "fire", label: "Ember", emoji: "🔥" },
  { id: "water", label: "Sky-tear", emoji: "💧" },
  { id: "herb", label: "Whispering Leaf", emoji: "🌿" },
  { id: "stone", label: "Ancient Stone", emoji: "🪨" },
  { id: "wind", label: "Wandering Wind", emoji: "🌪️" },
  { id: "shadow", label: "Silent Shadow", emoji: "🌑" },
];

const RECIPE = ["fire", "water", "herb"];
const RECIPE_HINT =
  "First the blood of ember, then the tear of sky, sealed with whisper of leaf.";

export default function PotionMixingGame({ onWin }: PotionMixingGameProps) {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [smoking, setSmoking] = useState(false);

  const addToSlot = (id: string) => {
    if (smoking) return;
    const emptyIndex = slots.findIndex((s) => s === null);
    if (emptyIndex === -1) return;
    const next = [...slots];
    next[emptyIndex] = id;
    setSlots(next);
  };

  const clearSlot = (index: number) => {
    if (smoking) return;
    const next = [...slots];
    next[index] = null;
    setSlots(next);
  };

  const brew = () => {
    if (slots.some((s) => s === null) || smoking) return;
    const isCorrect = slots.every((s, i) => s === RECIPE[i]);
    if (isCorrect) {
      onWin();
      return;
    }
    setSmoking(true);
    setTimeout(() => {
      setSlots([null, null, null]);
      setSmoking(false);
    }, 900);
  };

  return (
    <div>
      <div className="rounded-lg border border-amber-700/40 bg-stone-950/60 px-4 py-3 mb-5">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-400/70 mb-1">
          Recipe Scroll
        </p>
        <p className="text-white/70 text-sm italic leading-relaxed">{RECIPE_HINT}</p>
      </div>

      {/* Cauldron slots */}
      <div className="flex items-center justify-center gap-3 mb-6">
        {slots.map((slot, i) => {
          const ingredient = INGREDIENTS.find((ing) => ing.id === slot);
          return (
            <button
              key={i}
              onClick={() => clearSlot(i)}
              disabled={smoking}
              className="h-14 w-14 flex items-center justify-center rounded-full border-2 border-amber-700/60 bg-stone-900/80 text-2xl transition-all disabled:cursor-not-allowed"
              style={smoking ? { animation: "puzzle-smoke 0.9s ease-in-out" } : undefined}
            >
              {smoking ? "💨" : ingredient?.emoji ?? <span className="text-stone-600 text-sm">?</span>}
            </button>
          );
        })}
      </div>

      {smoking && (
        <p className="text-center text-red-400 text-sm mb-4">The mixture fizzles and fails…</p>
      )}

      {/* Ingredient picker */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {INGREDIENTS.map((ing) => (
          <button
            key={ing.id}
            onClick={() => addToSlot(ing.id)}
            disabled={smoking || slots.every((s) => s !== null)}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 hover:border-amber-500/50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="text-xl">{ing.emoji}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/50">{ing.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={brew}
        disabled={slots.some((s) => s === null) || smoking}
        className="w-full rounded-lg border border-emerald-600/70 bg-emerald-900/40 py-2.5 text-sm font-semibold uppercase tracking-widest text-emerald-300 transition-colors hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Brew
      </button>
    </div>
  );
}
