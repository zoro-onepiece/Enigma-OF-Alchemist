/**
 * GameCanvas
 *
 * The root React Three Fiber <Canvas> wrapper.
 * Keep ALL Three.js / R3F logic inside this component tree.
 * DOM overlays (HUD, modals, inventory) live OUTSIDE this tree in App.tsx.
 *
 * Usage:
 *   <GameCanvas>
 *     <Player />
 *     <GameEnvironment />
 *     <MonsterSpawner />
 *   </GameCanvas>
 */
import { Canvas } from "@react-three/fiber";
import { ReactNode } from "react";

interface GameCanvasProps {
  children?: ReactNode;
}

export default function GameCanvas({ children }: GameCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 10], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: "#0a0a1a" }}
    >
      {children}
    </Canvas>
  );
}
