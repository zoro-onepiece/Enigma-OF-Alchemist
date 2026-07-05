// @ts-nocheck
// GameHUD.jsx
// Task 3: 2D UI overlay for "Enigma of Alchemist"
// Sits ON TOP of the R3F <Canvas> via absolute positioning + z-index.
//
// Theme direction: "alchemist's workbench" — aged brass, deep ink-green glass,
// and a glowing elixir health bar rather than a generic red HP strip.
// The health fill is a potion vial: emerald liquid with a shimmer sweep.
//
// pointer-events-none on the root keeps mouse/touch flowing to the 3D canvas;
// pointer-events-auto is re-enabled only on interactive elements (wallet button).

import React from "react";
import { useSoundStore } from "../../store/soundStore";

export default function GameHUD({
  health = 72,
  maxHealth = 100,
  score = 340,
  essences = 3, // collected alchemical essences / NFT keys
  onConnectWallet = () => {},
  walletAddress = null,
}) {
  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const lowHealth = healthPct <= 25;
  const muted = useSoundStore((s) => s.muted);
  const toggleMute = useSoundStore((s) => s.toggleMute);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 select-none font-serif">

      {/* ── TOP LEFT: Elixir Health Bar ─────────────────────────────── */}
      <div className="absolute left-4 top-4 flex items-center gap-3">
        {/* Alchemy sigil medallion */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-amber-600/80 bg-gradient-to-b from-stone-900 to-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
          <span className="text-2xl text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
            ⚗️
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.25em] text-amber-200/90 drop-shadow">
            Vitality Elixir
          </span>

          {/* Vial track */}
          <div className="relative h-5 w-56 overflow-hidden rounded-full border-2 border-amber-700/90 bg-stone-950/80 shadow-inner">
            {/* Liquid fill */}
            <div
              className={[
                "h-full rounded-full transition-all duration-500 ease-out",
                lowHealth
                  ? "bg-gradient-to-r from-red-800 via-red-500 to-orange-400 animate-pulse"
                  : "bg-gradient-to-r from-emerald-800 via-emerald-500 to-lime-300",
              ].join(" ")}
              style={{ width: `${healthPct}%` }}
            />
            {/* Glass shine overlay */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2 rounded-full bg-white/15" />
            {/* HP text */}
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {health} / {maxHealth}
            </span>
          </div>
        </div>
      </div>

      {/* ── TOP RIGHT: Web3 Connect Wallet (placeholder) ────────────── */}
      <div className="absolute right-4 top-4 flex items-start gap-2">
        <button
          onClick={toggleMute}
          title={muted ? "Unmute puzzle sounds" : "Mute puzzle sounds"}
          className="pointer-events-auto flex h-[42px] w-[42px] items-center justify-center rounded-lg border-2 border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 text-lg text-amber-100 shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)] active:scale-95"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={onConnectWallet}
          className="pointer-events-auto group flex items-center gap-2 rounded-lg border-2 border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 px-4 py-2 text-sm font-semibold tracking-wide text-amber-100 shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)] active:scale-95"
        >
          <span className="text-lg transition-transform group-hover:rotate-12">
            🜛
          </span>
          {shortAddr ? (
            <span className="font-mono text-emerald-300">{shortAddr}</span>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
        {/* Network tag */}
        <div className="mt-1 text-right text-[10px] uppercase tracking-widest text-emerald-400/70">
          Arbitrum Sepolia
        </div>
      </div>

      {/* ── BOTTOM RIGHT: Inventory / Score ─────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        {/* Score plaque */}
        <div className="rounded-md border border-amber-600/70 bg-stone-950/80 px-4 py-1.5 shadow-lg backdrop-blur-sm">
          <span className="mr-2 text-[10px] uppercase tracking-[0.3em] text-amber-400/80">
            Arcana
          </span>
          <span className="text-lg font-bold text-amber-100 drop-shadow">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Inventory slots (4 slots; filled = collected essence) */}
        <div className="flex gap-2 rounded-xl border-2 border-amber-700/70 bg-gradient-to-b from-stone-900/90 to-stone-950/90 p-2 shadow-[0_0_16px_rgba(0,0,0,0.6)] backdrop-blur-sm">
          {[0, 1, 2, 3].map((slot) => {
            const filled = slot < essences;
            return (
              <div
                key={slot}
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all",
                  filled
                    ? "border-emerald-400/80 bg-emerald-900/60 shadow-[inset_0_0_10px_rgba(52,211,153,0.5)]"
                    : "border-stone-600/60 bg-stone-800/50",
                ].join(" ")}
              >
                {filled ? (
                  <span className="text-xl drop-shadow-[0_0_5px_rgba(52,211,153,0.9)]">
                    🧪
                  </span>
                ) : (
                  <span className="text-stone-600">✦</span>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300/60">
          Essences · {essences} / 4
        </span>
      </div>
    </div>
  );
}

/* ── Integration in App.jsx ─────────────────────────────────────────────────

import { Canvas } from "@react-three/fiber";
import GameHUD from "./GameHUD";
import Scene from "./Scene";

export default function App() {
  return (
    // relative wrapper is REQUIRED so the HUD's absolute inset-0 anchors here
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 50 }}>
        <Scene />
      </Canvas>

      <GameHUD
        health={72}
        score={340}
        essences={3}
        walletAddress={null}
        onConnectWallet={() => console.log("TODO: wire wagmi/ethers here")}
      />
    </div>
  );
}

NOTES:
- Root div uses pointer-events-none so OrbitControls / character input still
  work; only the wallet button re-enables pointer-events-auto.
- When your teammate wires up real Web3, pass the connected address into
  `walletAddress` and it auto-switches to the truncated 0x1234…abcd display.
- Health/score/essences are plain props — connect them to your game state
  store (zustand works great with R3F) later.
──────────────────────────────────────────────────────────────────────────── */
