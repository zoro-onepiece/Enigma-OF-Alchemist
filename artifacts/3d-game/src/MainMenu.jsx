// src/MainMenu.jsx
// Main Menu for "Enigma of Alchemist"
// v3: Login is now email OTP (Magic Link) instead of Google OAuth — see
// src/lib/magic.ts for why.
//
// Also keeps a DEV-ONLY bypass button so collaborators can skip login
// while auth is being configured. The bypass button renders ONLY in
// development (import.meta.env.DEV) — it disappears in production.

import React, { useState } from "react";

export default function MainMenu({ onLogin, onDevBypass, isLoading = false, error = null }) {
  const isDev = import.meta.env.DEV;
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || isLoading) return;
    onLogin(trimmed);
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-stone-950 via-emerald-950 to-stone-950 font-serif">

      {/* Faint alchemy-circle backdrop */}
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

      {/* ── TITLE ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center text-center">
        <span className="mb-3 text-4xl text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.8)]">
          ⚗️
        </span>
        <h1 className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-5xl font-bold tracking-wider text-transparent drop-shadow-[0_2px_10px_rgba(217,119,6,0.45)] md:text-7xl">
          Enigma of Alchemist
        </h1>
        <p className="mt-4 text-sm uppercase tracking-[0.45em] text-emerald-300/70 md:text-base">
          A Web3 Puzzle Adventure
        </p>
      </div>

      {/* ── LOGIN FORM (Magic Link email OTP) ───────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="relative mt-14 flex w-full max-w-sm flex-col items-center gap-4 px-6"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          placeholder="you@example.com"
          className="w-full rounded-xl border-2 border-amber-500/60 bg-stone-900/70 px-5 py-3 text-center text-amber-100 placeholder:text-stone-500 outline-none transition-colors focus:border-amber-300 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="group relative w-full rounded-xl border-2 border-amber-500/90 bg-gradient-to-b from-stone-800 to-emerald-950 px-12 py-4 text-xl font-semibold tracking-widest text-amber-100 shadow-[0_0_24px_rgba(217,119,6,0.4)] transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_36px_rgba(251,191,36,0.6)] active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
        >
          <span className="absolute -left-2 -top-2 text-amber-400/80">✦</span>
          <span className="absolute -bottom-2 -right-2 text-amber-400/80">✦</span>

          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
              Summoning Portal…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3">
              <span className="transition-transform group-hover:rotate-12">🜛</span>
              Send Magic Link
            </span>
          )}
        </button>

        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>

      <p className="mt-6 text-xs tracking-wider text-stone-400">
        Enter your email — your wallet is conjured automatically
      </p>

      {/* ── DEV BYPASS (development builds only) ──────────────────────── */}
      {isDev && (
        <button
          onClick={onDevBypass}
          className="mt-8 rounded-md border border-dashed border-stone-500/60 bg-stone-900/60 px-5 py-2 text-xs uppercase tracking-[0.2em] text-stone-400 transition-all hover:border-emerald-400/60 hover:text-emerald-300"
          title="Skips authentication with a fake wallet — dev builds only"
        >
          ⚒ Dev Bypass — Enter Without Login
        </button>
      )}

      {/* Network badge */}
      <div className="absolute bottom-5 text-[10px] uppercase tracking-[0.35em] text-emerald-400/50">
        Arbitrum Sepolia Network
      </div>
    </div>
  );
}
