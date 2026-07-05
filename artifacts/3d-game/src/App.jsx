// src/App.jsx
// Root of "Enigma of Alchemist"
// Flow: MainMenu (email OTP) → 3D game + HUD
//
// v3: Google OAuth was replaced with Magic Link email OTP — see
// src/lib/magic.ts for why.
//
// Dev bypass: sets a fake wallet so frontend work can continue without
// needing to click through a real email login. Only reachable in dev
// builds (the button is hidden in production by MainMenu).
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

import React, { useEffect, useState } from "react";
import Scene from "@/components/scene/Scene";
import MainMenu from "@/MainMenu";
import { loginWithEmail, getExistingSession, logout } from "@/lib/magic";

// Obviously-fake address so it's never confused with a real wallet.
const DEV_WALLET = "0xDEV000000000000000000000000000000000DEV";

export default function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isDevSession, setIsDevSession] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    (async () => {
      const existing = await getExistingSession();
      console.log("[DEBUG] getExistingSession() resolved with:", existing);
      if (existing) setWalletAddress(existing);
      setAuthLoading(false);
    })();
  }, []);

  const handleLogin = async (email) => {
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
      console.error("Login failed:", err);
      setAuthError(err?.message ?? "Login failed — please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // ── DEV BYPASS: skip auth entirely (dev builds only) ─────────
  const handleDevBypass = () => {
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {isLoggedIn && (
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
          onLogin={handleLogin}
          onDevBypass={handleDevBypass}
          isLoading={authLoading}
          error={authError}
        />
      )}
    </div>
  );
}
