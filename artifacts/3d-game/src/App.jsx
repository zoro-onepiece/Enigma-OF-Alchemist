// src/App.jsx
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import MainMenu from "@/MainMenu";
import IntroStory from "@/components/story/IntroStory";
import LoadingScreen from "@/components/story/LoadingScreen";
import WebGLErrorBoundary from "@/components/scene/WebGLErrorBoundary";

const Scene = lazy(() => import("@/components/scene/Scene"));
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

const DEV_WALLET = "0xDEV000000000000000000000000000000000DEV";

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isDevSession, setIsDevSession] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    (async () => {
      const fromRedirect = await handleOAuthRedirect();
      if (fromRedirect) {
        setWalletAddress(fromRedirect);
        setBootstrapping(false);
        return;
      }
      const existing = await getExistingSession();
      if (existing) setWalletAddress(existing);
      setBootstrapping(false);
    })();
  }, []);

  const confirmUserGesture = () => {
    markAudioInteracted();
    markVoiceInteracted();
  };

  const handleLoginWithEmail = async (email) => {
    confirmUserGesture();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginWithEmail(email);
      const address = await getExistingSession();
      if (address) {
        setWalletAddress(address);
      } else {
        setAuthError("Login didn't complete — please try again.");
      }
    } catch (err) {
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
      await loginWithGoogle();
    } catch (err) {
      setAuthError(err?.message || "Google login failed. Please try again.");
      setAuthLoading(false);
    }
  };

  const handleDevBypass = () => {
    confirmUserGesture();
    setIsDevSession(true);
    setWalletAddress(DEV_WALLET);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (!isDevSession) await logout();
    setIsDevSession(false);
    setWalletAddress(null);
  };

  const isLoggedIn = Boolean(walletAddress);
  const hasSeenIntro = useGameStore((s) => s.hasSeenIntro);
  const setHasSeenIntro = useGameStore((s) => s.setHasSeenIntro);

  const hasGreetedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    playVoiceLine(
      "greeting_welcome",
      "Where... where am I? I think... I think I'm lost. What awaits me here?",
      { priority: true },
    );
  }, [isLoggedIn]);

  const gameplayActive = isLoggedIn && hasSeenIntro;
  useEffect(() => {
    setVoidAmbienceActive(!gameplayActive);
    if (!gameplayActive) stopMusic();
  }, [gameplayActive]);

  if (bootstrapping && !isLoggedIn) {
    return <div className="relative h-screen w-screen overflow-hidden bg-slate-950" />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* Persistent Scene to avoid WebGL context leaks */}
      <div
        className={`absolute inset-0 ${
          isLoggedIn && hasSeenIntro ? "z-0 opacity-100 pointer-events-auto" : "z-0 opacity-0 pointer-events-none"
        }`}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Scene walletAddress={walletAddress} onConnectWallet={handleLogout} />
        </Suspense>
      </div>

      {isLoggedIn && !hasSeenIntro && (
        <div className="absolute inset-0 z-50">
          <IntroStory onBegin={setHasSeenIntro} />
        </div>
      )}

      {isLoggedIn && hasSeenIntro && isDevSession && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-[70] -translate-x-1/2 rounded border border-amber-600/50 bg-stone-950/80 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-amber-400/80">
          Dev Session — Not Logged In
        </div>
      )}

      {!isLoggedIn && (
        <div className="absolute inset-0 z-50">
          <MainMenu
            onLoginWithEmail={handleLoginWithEmail}
            onLoginWithGoogle={handleLoginWithGoogle}
            onDevBypass={handleDevBypass}
            isLoading={authLoading}
            error={authError}
          />
        </div>
      )}
    </div>
  );
}