// src/App.jsx
// Root of "Enigma of Alchemist"
// Flow: MainMenu (2D) → Magic Google login → 3D game + HUD
//
// The 3D Canvas is ONLY mounted after login succeeds, so heavy GLB
// models don't load behind the menu.

import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import GameHUD from "./GameHUD";
import MainMenu from "./MainMenu";
import {
  loginWithGoogle,
  handleOAuthRedirect,
  getExistingSession,
  logout,
} from "./lib/magic";

export default function App() {
  // ── Auth state ─────────────────────────────────────────────
  // walletAddress === null  → show MainMenu
  // walletAddress === "0x…" → show game
  const [walletAddress, setWalletAddress] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Game state (temporary — move to zustand later) ─────────
  const [health] = useState(72);
  const [score] = useState(340);
  const [essences] = useState(3);

  // On first load: (1) complete Google OAuth redirect if we just
  // came back from Google, else (2) restore an existing session.
  useEffect(() => {
    (async () => {
      const fromRedirect = await handleOAuthRedirect();
      if (fromRedirect) {
        setWalletAddress(fromRedirect);
        setAuthLoading(false);
        return;
      }
      const existing = await getExistingSession();
      if (existing) setWalletAddress(existing);
      setAuthLoading(false);
    })();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      await loginWithGoogle(); // redirects away to Google
    } catch (err) {
      console.error("Login failed:", err);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setWalletAddress(null);
  };

  const isLoggedIn = Boolean(walletAddress);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      {/* ── 3D GAME — mounted only after login ─────────────────── */}
      {isLoggedIn && (
        <>
          <Canvas
            shadows
            camera={{ position: [0, 5, 12], fov: 50 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true }}
          >
            <Scene />
          </Canvas>

          <GameHUD
            health={health}
            maxHealth={100}
            score={score}
            essences={essences}
            walletAddress={walletAddress}  // shows 0x1234…abcd top-right
            onConnectWallet={handleLogout} // clicking the address logs out
          />
        </>
      )}

      {/* ── 2D MAIN MENU — hidden after login ───────────────────── */}
      {!isLoggedIn && (
        <MainMenu onLogin={handleLogin} isLoading={authLoading} />
      )}
    </div>
  );
}
