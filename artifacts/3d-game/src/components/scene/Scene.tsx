import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Environment, Sky, Stats } from "@react-three/drei";
import * as THREE from "three";
import Floor from "./Floor";
import { WorldModel } from "./WorldModel";
import Player, { PLAYER_SPAWN, PLAYER_WORLD_POS, PLAYER_WORLD_ROT } from "../3d/Player";
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

// ─── Third-person follow camera ───────────────────────────────────────────────
const _camTarget = new THREE.Vector3();
const _camPos    = new THREE.Vector3();
const _lookAt    = new THREE.Vector3();

function FollowCamera() {
  const { camera } = useThree();

  // Set initial camera pose once — matches PLAYER_SPAWN so the camera
  // doesn't pop from the world origin to the (now far-away) spawn point.
  const initialised = useRef(false);
  if (!initialised.current) {
    const [sx, sy, sz] = PLAYER_SPAWN;
    camera.position.set(sx, sy + 3, sz + 8);
    camera.lookAt(sx, sy + 1.2, sz);
    initialised.current = true;
  }

  useFrame(() => {
    const px = PLAYER_WORLD_POS.x;
    const py = PLAYER_WORLD_POS.y;
    const pz = PLAYER_WORLD_POS.z;
    const ry = PLAYER_WORLD_ROT.y;

    // Offset: 7 units behind the player, 3 units up — rotates with the player
    const offsetX = Math.sin(ry) * 7;
    const offsetZ = Math.cos(ry) * 7;

    _camPos.set(px + offsetX, py + 3.5, pz + offsetZ);
    _lookAt.set(px, py + 1.4, pz);

    // Smooth follow
    camera.position.lerp(_camPos, 0.06);
    _camTarget.lerp(_lookAt, 0.1);
    camera.lookAt(_camTarget);
  });

  return null;
}

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
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 3, 8], fov: 50, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0a18" }}
      >
        {showStats && <Stats />}

        {/* Follow camera (replaces OrbitControls — conflicts with movement) */}
        <FollowCamera />

        {/* ── Lighting ──────────────────────────────────────────────────── */}
        {/* Soft fill for the anime character skin */}
        <ambientLight intensity={0.55} color="#d4c8ff" />

        {/* Key light — warm from front-left. Shadow frustum is centered on
            PLAYER_SPAWN (not the world origin) and widened since the
            character now lives ~50 units out into the scaled-up forest. */}
        <directionalLight
          position={[PLAYER_SPAWN[0] + 6, 12, PLAYER_SPAWN[2] + 8]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={80}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={25}
          shadow-camera-bottom={-25}
          target-position={PLAYER_SPAWN}
          color="#fff5e0"
        />

        {/* Rim light — cool from behind to separate character from bg */}
        <directionalLight
          position={[PLAYER_SPAWN[0] - 4, 6, PLAYER_SPAWN[2] - 8]}
          intensity={0.6}
          color="#8ecfff"
        />

        {/* Purple fill from below for anime dungeon vibe */}
        <pointLight position={[PLAYER_SPAWN[0], 0.3, PLAYER_SPAWN[2]]} intensity={0.4} color="#7c3aed" distance={8} />

        {/* Shadow-casting sun light — also re-centered on the spawn area
            since the forest is now ~250 units across. */}
        <directionalLight
          castShadow
          position={[PLAYER_SPAWN[0] + 15, 25, PLAYER_SPAWN[2] + 10]}
          intensity={1.4}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
          shadow-camera-near={0.5}
          shadow-camera-far={150}
          target-position={PLAYER_SPAWN}
        />

        {/* ── Environment & ground ──────────────────────────────────────── */}
        <Sky sunPosition={[15, 25, 10]} turbidity={6} rayleigh={1.2} />
        <Environment preset="night" />

        <Suspense fallback={null}>
          {/*
            Forest is now the real walkable world (not a diorama).
            targetSize=250 makes the model's widest axis span 250 world
            units, so trees read as 3-5x the character's height.

            position.y=-56 is NOT a guess: measured the raw GLB's mesh
            accessors directly (grnd top vs. the model's overall lowest
            point, which is the slope mesh) and solved for the offset
            that puts the "grnd" mesh's walkable top surface exactly at
            world y=0 — the height the character always stands at (she
            has no vertical/ground-raycast movement, see Player.tsx).
            Final value: position.y = -(grndTopLocal - overallMinLocal) * scale
                                     = -(1.332 - (-0.176)) * (250/6.73)
                                     ≈ -56.0
          */}
          <WorldModel url="/models/low_poly_forest.glb" targetSize={250} position={[0, -56, 0]} />

          {/* Extra trees — enable once positioned/tested:
          <WorldModel url="/models/trees_optimized.glb" targetSize={30} position={[8, 0.1, -10]} />
          */}
        </Suspense>

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
          { keys: "W / ↑",   label: "Forward"  },
          { keys: "S / ↓",   label: "Backward" },
          { keys: "A / ←",   label: "Turn L"   },
          { keys: "D / →",   label: "Turn R"   },
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
