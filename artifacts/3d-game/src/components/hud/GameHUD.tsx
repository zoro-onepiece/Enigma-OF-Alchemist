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
  // Task D: puzzle-location map toggle — desktop "M" key or this icon.
  mapOpen = false,
  onToggleMap = () => {},
  // Locker/Inventory toggle — desktop "I" key or this icon.
  lockerOpen = false,
  onToggleLocker = () => {},
  // Task B: true on touch/narrow-viewport devices — reserves extra bottom
  // clearance under the score/inventory panel so it never sits under the
  // on-screen action button (both are bottom-right).
  mobileControlsActive = false,
}) {
  const healthPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const lowHealth = healthPct <= 25;
  const muted = useSoundStore((s) => s.muted);
  const toggleMute = useSoundStore((s) => s.toggleMute);

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return (
    // z-[52]: just above PuzzleModal's z-50 backdrop (bg-black/70 +
    // backdrop-blur-sm), which otherwise fully visually covers this HUD
    // even though it stays mounted — the health bar needs to stay visible
    // and live while a puzzle is open, since puzzle losses damage the
    // player in real time. Still below MobileControls (55)/SubtitleBar
    // (58)/AudioMuteToggle (60)/MinimapOverlay (65), so their existing
    // relative order is untouched.
    <div className="pointer-events-none absolute inset-0 z-[52] select-none font-serif">

      {/* ── TOP LEFT: Elixir Health Bar ─────────────────────────────── */}
      <div className="absolute left-2 top-2 flex items-center gap-2 sm:left-4 sm:top-4 sm:gap-3">
        {/* Alchemy sigil medallion */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-amber-600/80 bg-gradient-to-b from-stone-900 to-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.35)] sm:h-14 sm:w-14">
          <span className="text-lg text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)] sm:text-2xl">
            ⚗️
          </span>
        </div>

        <div className="flex flex-col gap-0.5 sm:gap-1">
          <span className="text-[9px] uppercase tracking-[0.15em] text-amber-200/90 drop-shadow sm:text-xs sm:tracking-[0.25em]">
            Vitality Elixir
          </span>

          {/* Vial track */}
          <div className="relative h-4 w-36 overflow-hidden rounded-full border-2 border-amber-700/90 bg-stone-950/80 shadow-inner sm:h-5 sm:w-56">
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
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tracking-wider text-amber-50 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[11px]">
              {health} / {maxHealth}
            </span>
          </div>
        </div>
      </div>

      {/* ── TOP RIGHT: Web3 Connect Wallet (placeholder) ────────────── */}
      <div className="absolute right-2 top-2 flex items-start gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <button
          onClick={onToggleMap}
          title={mapOpen ? "Close map (M)" : "Open map (M)"}
          aria-pressed={mapOpen}
          className={[
            "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border-2 text-sm shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 active:scale-95 sm:h-[42px] sm:w-[42px] sm:text-lg",
            mapOpen
              ? "border-amber-300 bg-amber-500/20 text-amber-200"
              : "border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 text-amber-100 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)]",
          ].join(" ")}
        >
          🗺️
        </button>
        <button
          onClick={onToggleLocker}
          title={lockerOpen ? "Close locker (I)" : "Open locker (I)"}
          aria-pressed={lockerOpen}
          className={[
            "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border-2 text-sm shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 active:scale-95 sm:h-[42px] sm:w-[42px] sm:text-lg",
            lockerOpen
              ? "border-amber-300 bg-amber-500/20 text-amber-200"
              : "border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 text-amber-100 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)]",
          ].join(" ")}
        >
          🎒
        </button>
        <button
          onClick={toggleMute}
          title={muted ? "Unmute puzzle sounds" : "Mute puzzle sounds"}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border-2 border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 text-sm text-amber-100 shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)] active:scale-95 sm:h-[42px] sm:w-[42px] sm:text-lg"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={onConnectWallet}
          className="pointer-events-auto group flex items-center gap-1 rounded-lg border-2 border-amber-500/80 bg-gradient-to-b from-stone-800/95 to-emerald-950/95 px-2.5 py-1.5 text-xs font-semibold tracking-wide text-amber-100 shadow-[0_0_14px_rgba(217,119,6,0.35)] backdrop-blur-sm transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.55)] active:scale-95 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
        >
          <span className="text-sm transition-transform group-hover:rotate-12 sm:text-lg">
            🜛
          </span>
          {shortAddr ? (
            <span className="font-mono text-emerald-300">{shortAddr}</span>
          ) : (
            <span>Connect Wallet</span>
          )}
        </button>
        {/* Network tag — hidden below sm, top row is tight enough on a
            375/414px phone without it; the wallet button already implies
            the network via its own copy once connected. */}
        <div className="mt-1 hidden text-right text-[10px] uppercase tracking-widest text-emerald-400/70 sm:block">
          Arbitrum Sepolia
        </div>
      </div>

      {/* ── BOTTOM RIGHT: Inventory / Score ───────────────────────────
          Extra bottom clearance when the mobile action button is showing
          (both live bottom-right) so the two never overlap. ──────────── */}
      <div
        className={[
          "absolute right-2 flex flex-col items-end gap-1.5 sm:right-4 sm:gap-2",
          mobileControlsActive ? "bottom-24" : "bottom-2 sm:bottom-4",
        ].join(" ")}
      >
        {/* Score plaque */}
        <div className="rounded-md border border-amber-600/70 bg-stone-950/80 px-2.5 py-1 shadow-lg backdrop-blur-sm sm:px-4 sm:py-1.5">
          <span className="mr-1.5 text-[8px] uppercase tracking-[0.2em] text-amber-400/80 sm:mr-2 sm:text-[10px] sm:tracking-[0.3em]">
            Arcana
          </span>
          <span className="text-sm font-bold text-amber-100 drop-shadow sm:text-lg">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Inventory slots (4 slots; filled = collected essence) */}
        <div className="flex gap-1.5 rounded-xl border-2 border-amber-700/70 bg-gradient-to-b from-stone-900/90 to-stone-950/90 p-1.5 shadow-[0_0_16px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:gap-2 sm:p-2">
          {[0, 1, 2, 3].map((slot) => {
            const filled = slot < essences;
            return (
              <div
                key={slot}
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all sm:h-12 sm:w-12",
                  filled
                    ? "border-emerald-400/80 bg-emerald-900/60 shadow-[inset_0_0_10px_rgba(52,211,153,0.5)]"
                    : "border-stone-600/60 bg-stone-800/50",
                ].join(" ")}
              >
                {filled ? (
                  <span className="text-sm drop-shadow-[0_0_5px_rgba(52,211,153,0.9)] sm:text-xl">
                    🧪
                  </span>
                ) : (
                  <span className="text-xs text-stone-600 sm:text-base">✦</span>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-[8px] uppercase tracking-[0.15em] text-amber-300/60 sm:text-[10px] sm:tracking-[0.25em]">
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
