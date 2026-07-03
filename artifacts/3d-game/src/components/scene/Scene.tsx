import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Environment, Sky, Stats, KeyboardControls } from "@react-three/drei";
import Floor from "./Floor";
import { WorldModel } from "./WorldModel";
import Lighting from "./Lighting";
import Player, { PLAYER_SPAWN, playerKeyboardMap } from "../3d/Player";
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
// now lives entirely inside Player.tsx, since it needs the player's group
// ref and movement math every frame. Nothing camera-related is declared
// here anymore.

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
}

export default function Scene({ showStats = false }: SceneProps) {
  const [health] = useState(72);
  const [score] = useState(340);
  const [essences] = useState(3);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleConnectWallet = () => {
    // Placeholder — Magic Labs + Openfort wiring happens here for Arbitrum Sepolia.
    console.log("TODO: connect wallet (Arbitrum Sepolia)");
    setWalletAddress("0x1234abcd5678ef901234abcd5678ef901234abcd");
  };

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

        {/* ── Environment & ground ──────────────────────────────────────── */}
        <Sky sunPosition={[15, 25, 10]} turbidity={6} rayleigh={1.2} />
        <Environment preset="night" />

        <Suspense fallback={null}>
          {/*
            Forest is the walkable world (not a diorama). targetSize=250
            makes the model's widest axis span 250 world units, so trees
            read as 3-5x the character's height.

            The character spawns at the world origin [0,0,0] and never
            raycasts against the ground — she just always stands at y=0.
            WorldModel's alignBottom option (on by default) already does
            the vertical alignment for us: it measures the raw GLB's own
            bounding box and computes an internal offset so the model's
            lowest point lands exactly at this `position.y`. Confirmed via
            console log — raw box min.y=-0.176 — so position.y=0 puts the
            walkable surface exactly at the character's feet. The earlier
            -2 / -25 values were fighting against that built-in alignment
            instead of trusting it.
          */}
          <WorldModel url="/models/low_poly_forest.glb" targetSize={250} position={[0, 0, 0]} />

          {/* Extra trees — enable once positioned/tested:
          <WorldModel url="/models/trees_optimized.glb" targetSize={30} position={[8, 0.1, -10]} />
          */}
        </Suspense>

        {/* TEMP DEBUG: transparent ground-alignment plane at y=-0.01.
            Since the forest's own walkable surface should already sit at
            y=0, this plane should read as *just barely* peeking through
            below her feet — if she looks like she's floating well above
            it or sunk well below it, that's a quick visual signal
            something regressed. Safe to delete once alignment is confirmed
            visually in a real browser. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#4a7c59" transparent opacity={0.3} />
        </mesh>

        <Floor />

        <Grid
          visible={false}
          position={[0, 0.001, 0]}
          args={[80, 80]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#3b1f7a"
          sectionSize={5}
          sectionThickness={0.9}
          sectionColor="#6d28d9"
          fadeDistance={35}
          fadeStrength={1}
          followCamera
          infiniteGrid
        />

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
        onConnectWallet={handleConnectWallet}
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
