import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Environment, Stats } from "@react-three/drei";
import * as THREE from "three";
import Floor from "./Floor";
import Player, { PLAYER_WORLD_POS, PLAYER_WORLD_ROT } from "../3d/Player";

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

  // Set initial camera pose once
  const initialised = useRef(false);
  if (!initialised.current) {
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1.2, 0);
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
  if (!isWebGLAvailable()) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
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

        {/* Key light — warm from front-left */}
        <directionalLight
          position={[6, 12, 8]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5}
          shadow-camera-far={60}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          color="#fff5e0"
        />

        {/* Rim light — cool from behind to separate character from bg */}
        <directionalLight
          position={[-4, 6, -8]}
          intensity={0.6}
          color="#8ecfff"
        />

        {/* Purple fill from below for anime dungeon vibe */}
        <pointLight position={[0, 0.3, 0]} intensity={0.4} color="#7c3aed" distance={8} />

        {/* ── Environment & ground ──────────────────────────────────────── */}
        <Environment preset="night" />

        <Floor />

        <Grid
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
