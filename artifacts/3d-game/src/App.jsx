// src/App.jsx
// Root of "Enigma of Alchemist"
// Flow: MainMenu → (Email OTP OR Google OAuth OR dev bypass) → 3D game + HUD
//
// v4: Dual-authentication onboarding — Email OTP (Magic Link) remains the
// primary/most reliable path (see src/lib/magic.ts for the Replit-iframe
// history), and Google OAuth is offered as a one-click alternative.
//
// Dev bypass: sets a fake wallet so frontend work can continue without
// needing to click through a real login. Only reachable in dev builds
// (the button is hidden in production by MainMenu).
//
// NOTE ON INTEGRATION: Scene (@/components/scene/Scene) already mounts its
// own <Canvas> and its own <GameHUD> internally (it's a self-contained,
// drop-in component — see Scene.tsx), so this file does NOT wrap it in a
// second <Canvas> or render a second <GameHUD> as a standalone reference
// App.jsx might. Doing so would nest two R3F Canvases inside each other,
// which breaks WebGL context creation. Instead, the real/dev wallet
// address and logout handler are passed straight through as props so
// Scene's own internal GameHUD displays them. Scene/GameHUD were not
// otherwise modified.

import React, { useEffect, useRef, useState } from "react";
import Scene from "@/components/scene/Scene";
import MainMenu from "@/MainMenu";
import IntroStory from "@/components/story/IntroStory";
import { useGameStore } from "@/store/gameStore";
import { setVoidAmbienceActive, stopMusic, markUserInteracted as markAudioInteracted } from "@/audio/sounds";
import {
  playVoiceLine,
  markUserInteracted as markVoiceInteracted,
  hasUserInteracted,
} from "@/audio/voice";
import {
  loginWithEmail,
  loginWithGoogle,
  handleOAuthRedirect,
  getExistingSession,
  logout,
} from "@/lib/magic";

// Obviously-fake address so it's never confused with a real wallet.
const DEV_WALLET = "0xDEV000000000000000000000000000000000DEV";

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isDevSession, setIsDevSession] = useState(false);
  // `bootstrapping` covers ONLY the one-time initial redirect/session check
  // on mount — it gates whether the login menu is rendered at all, so the
  // menu never flashes on screen mid-bootstrap. `authLoading` is a separate
  // flag that only reflects "a login attempt (email OTP or Google) is in
  // flight" and drives MainMenu's own spinner state. Keeping these separate
  // matters: reusing one flag for both meant clicking a login action
  // re-triggered the bootstrap's blank-screen gate, hiding the login UI
  // behind an empty screen instead of showing the intended loading state.
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Order matters: check for a fresh OAuth redirect first (the user just
    // came back from Google), then fall back to an existing session (the
    // user revisited/refreshed while already logged in, whether via email
    // OTP or Google). The login screen is only rendered once both checks
    // have resolved (bootstrapping=false), so there's no flash of the
    // login screen while auth is still loading.
    (async () => {
      const fromRedirect = await handleOAuthRedirect();
      if (fromRedirect) {
        setWalletAddress(fromRedirect);
        setBootstrapping(false);
        return;
      }
      const existing = await getExistingSession();
      console.log("[DEBUG] getExistingSession() resolved with:", existing);
      if (existing) setWalletAddress(existing);
      setBootstrapping(false);
    })();
  }, []);

  // Confirms the audio/voice gesture gates synchronously, from inside the
  // actual trusted click handler that starts a login — not via the gates'
  // own pointerdown/keydown listeners, which only start existing once
  // something first calls into voice.ts/sounds.ts (i.e. AFTER this click
  // has already fully dispatched, so they can never observe it). Without
  // this, the first-ever queued line(s) of a session (greeting_welcome,
  // IntroStory's first paragraph) get silently cancelled by the next
  // click's cancelSpeech() before anything is ever heard — see
  // markUserInteracted()'s doc comment in voice.ts for the full race.
  const confirmUserGesture = () => {
    markAudioInteracted();
    markVoiceInteracted();
  };

  const handleLoginWithEmail = async (email) => {
    confirmUserGesture();
    setAuthError(null);
    setAuthLoading(true);
    try {
      console.log("[DEBUG] Sending magic link to:", email);
      await loginWithEmail(email);
      const address = await getExistingSession();
      console.log("[DEBUG] Post-login getExistingSession() resolved with:", address);
      if (address) {
        setWalletAddress(address);
      } else {
        setAuthError("Login didn't complete — please try again.");
      }
    } catch (err) {
      console.error("Email login failed:", err);
      setAuthError(err?.message || "Email login failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginWithGoogle = async () => {
    confirmUserGesture();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle(); // redirects away to Google
    } catch (err) {
      console.error("Google login failed:", err);
      setAuthError(err?.message || "Google login failed. Please try again.");
      setAuthLoading(false);
    }
  };

  // ── DEV BYPASS: skip auth entirely (dev builds only) ─────────
  const handleDevBypass = () => {
    console.log("🔊 Dev Bypass clicked at", Date.now());
    confirmUserGesture();
    console.warn("[dev] Auth bypassed — using fake wallet:", DEV_WALLET);
    setIsDevSession(true);
    setWalletAddress(DEV_WALLET);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (!isDevSession) await logout(); // no Magic session to clear in dev mode
    setIsDevSession(false);
    setWalletAddress(null);
  };

  const isLoggedIn = Boolean(walletAddress);
  const hasSeenIntro = useGameStore((s) => s.hasSeenIntro);
  const setHasSeenIntro = useGameStore((s) => s.setHasSeenIntro);

  // greeting_welcome: once, right after login succeeds, before IntroStory's
  // own first paragraph. `priority: true` guarantees it lands at the front
  // of voice.ts's shared queue regardless of React's parent/child effect
  // ordering (IntroStory's own effect — a child of this component — runs
  // before this one in the same commit, so without priority its paragraph
  // could enqueue first).
  const hasGreetedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    console.log(
      "🔊 greeting playback attempted at",
      Date.now(),
      "hasInteracted:",
      hasUserInteracted(),
    );
    playVoiceLine(
      "greeting_welcome",
      "Where... where am I? I think... I think I'm lost. What awaits me here?",
      { priority: true },
    );
  }, [isLoggedIn]);

  // Pre-gameplay ambience (void.mp3) plays across MainMenu + IntroStory and
  // stops the instant Scene mounts, where gameplay music (music.mp3) takes
  // over — the two loops are mutually exclusive. Also fades gameplay music
  // out on logout, since that's the same "gameplay just ended" transition.
  const gameplayActive = isLoggedIn && hasSeenIntro;
  useEffect(() => {
    setVoidAmbienceActive(!gameplayActive);
    if (!gameplayActive) stopMusic();
  }, [gameplayActive]);

  // While the initial redirect/session check is still resolving, render
  // nothing but the backdrop rather than the login menu — otherwise the
  // menu flashes on screen during bootstrap, which looks identical to a
  // "bounce back to login" even when auth is actually still loading. Once
  // bootstrap resolves, the menu (and its own isLoading-driven spinner) is
  // always shown instead of this blank screen.
  if (bootstrapping && !isLoggedIn) {
    return <div className="relative h-screen w-screen overflow-hidden bg-slate-950" />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {isLoggedIn && !hasSeenIntro && <IntroStory onBegin={setHasSeenIntro} />}

      {isLoggedIn && hasSeenIntro && (
        <>
          <Scene walletAddress={walletAddress} onConnectWallet={handleLogout} />

          {/* Small banner so dev sessions are never mistaken for real auth */}
          {isDevSession && (
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-[70] -translate-x-1/2 rounded border border-amber-600/50 bg-stone-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-400/80">
              Dev Session — Not Logged In
            </div>
          )}
        </>
      )}

      {!isLoggedIn && (
        <MainMenu
          onLoginWithEmail={handleLoginWithEmail}
          onLoginWithGoogle={handleLoginWithGoogle}
          onDevBypass={handleDevBypass}
          isLoading={authLoading}
          error={authError}
        />
      )}
    </div>
  );
}
