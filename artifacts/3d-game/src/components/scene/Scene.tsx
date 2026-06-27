import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Stats } from "@react-three/drei";
import Floor from "./Floor";
import ModelLoader from "./ModelLoader";

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
          in a real browser — deploy the app or open it in Chrome / Firefox to
          see the full scene.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-2 w-full max-w-sm">
        {[
          { label: "@react-three/fiber", desc: "React renderer for Three.js" },
          { label: "@react-three/drei", desc: "OrbitControls, Grid, Env…" },
          { label: "three.js", desc: "WebGL scene graph" },
        ].map((pkg) => (
          <div
            key={pkg.label}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-center"
          >
            <div className="text-xs font-mono text-purple-400 mb-1">{pkg.label}</div>
            <div className="text-[10px] text-white/30">{pkg.desc}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-white/20 text-center max-w-xs mt-2">
        Web3 auth components ready at{" "}
        <code className="bg-white/5 px-1 rounded text-purple-400/60">
          src/components/web3/
        </code>
      </div>
    </div>
  );
}

interface SceneProps {
  modelUrl?: string;
  showStats?: boolean;
}

export default function Scene({ modelUrl, showStats = false }: SceneProps) {
  if (!isWebGLAvailable()) {
    return <WebGLFallback />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ position: [6, 5, 8], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0f0f1a" }}
      >
        {showStats && <Stats />}

        {/* Lighting */}
        <ambientLight intensity={0.4} color="#c8b4ff" />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          color="#ffffff"
        />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#7c3aed" />
        <pointLight position={[5, 3, 5]} intensity={0.3} color="#2563eb" />

        {/* Environment (HDR backdrop) */}
        <Environment preset="night" />

        {/* Floor plane */}
        <Floor />

        {/* Grid overlay */}
        <Grid
          position={[0, 0.001, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#4c1d95"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#7c3aed"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />

        {/* GLB model loader — pass a URL via the modelUrl prop to load a real .glb */}
        <ModelLoader url={modelUrl} position={[0, 0, 0]} scale={1} />

        {/* Camera controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>

      {/* HUD overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-purple-300/60 pointer-events-none select-none">
        Drag to orbit · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
