import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sky, Stats, KeyboardControls } from "@react-three/drei";
import Lighting from "./Lighting";
import GameEnvironment from "./environment/GameEnvironment";
import Player, { playerKeyboardMap } from "../3d/Player";
import GameHUD from "../hud/GameHUD";

// ─── WebGL capability check ───────────────────────────────────────────────────
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Note: the Fortnite-style camera (OrbitControls + follow + target-locking)
// lives entirely inside Player.tsx, since it needs the player's group ref
// and movement math every frame. Nothing camera-related is declared here.
// Player.tsx is intentionally left untouched by this environment rewrite —
// it already assumes the walkable surface sits at y=0, which the temple
// garden's ground/pathway/platform all satisfy by construction (see
// GameEnvironment.tsx).

// ─── WebGL unavailable fallback ───────────────────────────────────────────────
function WebGLFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f1a] text-white gap-6 p-8">
      <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl">
        🎮
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-white mb-2">WebGL Unavailable</h2>
        <p className="text-sm text-white/50 leading-relaxed">
          This preview sandbox has no GPU access. The 3D scene renders correctly
          in a real browser — deploy the app or open it in Chrome / Firefox.
        </p>
      </div>
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
interface SceneProps {
  showStats?: boolean;
  // Optional pass-through so a parent App can drive the HUD's wallet
  // button with real auth state (Google login / dev bypass). When not
  // provided, Scene falls back to its own local placeholder state so it
  // still works standalone.
  walletAddress?: string | null;
  onConnectWallet?: () => void;
}

export default function Scene({
  showStats = false,
  walletAddress: walletAddressProp,
  onConnectWallet: onConnectWalletProp,
}: SceneProps) {
  const [health] = useState(72);
  const [score] = useState(340);
  const [essences] = useState(3);
  const [internalWalletAddress, setInternalWalletAddress] = useState<string | null>(null);

  const handleConnectWallet = () => {
    // Placeholder — Magic Labs + Openfort wiring happens here for Arbitrum Sepolia.
    console.log("TODO: connect wallet (Arbitrum Sepolia)");
    setInternalWalletAddress("0x1234abcd5678ef901234abcd5678ef901234abcd");
  };

  const walletAddress = walletAddressProp !== undefined ? walletAddressProp : internalWalletAddress;
  const onConnectWallet = onConnectWalletProp ?? handleConnectWallet;

  if (!isWebGLAvailable()) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-full relative">
      <KeyboardControls map={playerKeyboardMap}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 3, 8], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0a18" }}
      >
        {showStats && <Stats />}

        {/* ── Lighting ──────────────────────────────────────────────────── */}
        <Lighting />

        {/* ── Sky / ambience ────────────────────────────────────────────── */}
        <Sky sunPosition={[15, 25, 10]} turbidity={6} rayleigh={1.2} />
        <Environment preset="night" />

        {/* ── Code-generated Japanese temple garden environment ────────────
            Ground, pathway, temple, trees, and puzzle props — see
            GameEnvironment.tsx and its environment/ subcomponents. No GLB
            models are loaded here. */}
        <GameEnvironment />

        {/* ── Player ────────────────────────────────────────────────────── */}
        <Player />
      </Canvas>
      </KeyboardControls>

      {/* ── Alchemist HUD overlay ────────────────────────────────────────── */}
      <GameHUD
        health={health}
        maxHealth={100}
        score={score}
        essences={essences}
        walletAddress={walletAddress as never}
        onConnectWallet={onConnectWallet}
      />

      {/* ── Controls hint overlay ─────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none select-none">
        {[
          { keys: "W / ↑",   label: "Forward"    },
          { keys: "S / ↓",   label: "Backward"   },
          { keys: "A / ←",   label: "Strafe L"   },
          { keys: "D / →",   label: "Strafe R"   },
          { keys: "Mouse",   label: "Look Around"},
        ].map(({ keys, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5"
          >
            <kbd className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-[10px] font-mono text-purple-300">
              {keys}
            </kbd>
            <span className="text-[9px] text-white/30">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
