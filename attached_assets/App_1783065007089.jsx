// src/App.jsx
// Root of "Enigma of Alchemist" — 3D canvas + 2D HUD overlay.

import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./Scene";
import GameHUD from "./GameHUD";

export default function App() {
  // Temporary local game state. Later, replace with a zustand store
  // shared between the R3F scene and the HUD.
  const [health] = useState(72);
  const [score] = useState(340);
  const [essences] = useState(3);
  const [walletAddress, setWalletAddress] = useState(null);

  const handleConnectWallet = () => {
    // Placeholder — your teammate wires wagmi/ethers + Arbitrum Sepolia here.
    console.log("TODO: connect wallet (Arbitrum Sepolia)");
    // Demo: fake a connected address so you can see the HUD state change
    setWalletAddress("0x1234abcd5678ef901234abcd5678ef901234abcd");
  };

  return (
    // `relative` is REQUIRED — the HUD's absolute inset-0 anchors to this div.
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <Canvas
        shadows                                  // ← must be here for shadows
        camera={{ position: [0, 5, 12], fov: 50 }}
        dpr={[1, 1.5]}                           // caps pixel ratio; keeps Replit preview smooth
        gl={{ antialias: true }}
      >
        <Scene />
      </Canvas>

      <GameHUD
        health={health}
        maxHealth={100}
        score={score}
        essences={essences}
        walletAddress={walletAddress}
        onConnectWallet={handleConnectWallet}
      />
    </div>
  );
}
