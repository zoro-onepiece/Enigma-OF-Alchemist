// src/MainMenu.jsx
// Main Menu for "Enigma of Alchemist"
// v3: dual-authentication onboarding — Email OTP (Magic Link) as the
// primary option, Google OAuth as a one-click alternative, plus a
// DEV-ONLY bypass button so collaborators can skip auth entirely while
// login is being configured. The bypass button renders ONLY in
// development (import.meta.env.DEV) — it disappears in production.

import React, { useState } from "react";

export default function MainMenu({
  onLoginWithEmail,
  onLoginWithGoogle,
  onDevBypass,
  isLoading = false,
  error = null,
}) {
  const isDev = import.meta.env.DEV;
  const [email, setEmail] = useState("");

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!email || isLoading) return;
    onLoginWithEmail(email);
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

      {/* ── AUTH CARD ─────────────────────────────────────────────────── */}
      <div className="relative mt-12 flex w-full max-w-sm flex-col items-stretch gap-4 px-6">
        {/* ── OPTION A: Email OTP (Magic Link) ─────────────────────────── */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
            className="w-full rounded-xl border-2 border-emerald-700/60 bg-stone-900/80 px-5 py-3 text-center text-amber-100 placeholder:text-stone-500 outline-none transition-colors focus:border-amber-400/80 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isLoading || !email}
            className="group relative rounded-xl border-2 border-amber-500/90 bg-gradient-to-b from-stone-800 to-emerald-950 px-8 py-4 text-lg font-semibold tracking-widest text-amber-100 shadow-[0_0_24px_rgba(217,119,6,0.4)] transition-all hover:scale-105 hover:border-amber-300 hover:shadow-[0_0_36px_rgba(251,191,36,0.6)] active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
          >
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
        </form>

        {/* ── DIVIDER ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-emerald-700/40" />
          <span className="text-xs uppercase tracking-[0.3em] text-emerald-400/60">
            or
          </span>
          <div className="h-px flex-1 bg-emerald-700/40" />
        </div>

        {/* ── OPTION B: Google OAuth ────────────────────────────────────── */}
        <button
          type="button"
          onClick={onLoginWithGoogle}
          disabled={isLoading}
          className="flex items-center justify-center gap-3 rounded-xl border-2 border-stone-500/60 bg-stone-900/70 px-8 py-4 text-base font-semibold tracking-wide text-stone-100 transition-all hover:scale-105 hover:border-stone-300 active:scale-95 disabled:cursor-wait disabled:opacity-60 disabled:hover:scale-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 000 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
            />
          </svg>
          Continue with Google
        </button>

        {error && (
          <p className="mt-1 text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <p className="mt-6 text-xs tracking-wider text-stone-400">
        Sign in with email or Google — your wallet is conjured automatically
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
