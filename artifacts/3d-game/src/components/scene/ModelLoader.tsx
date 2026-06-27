import { Suspense, Component, ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── Placeholder (shown while loading or on error) ────────────────────────────

function PlaceholderMesh() {
  return (
    <group position={[0, 0.75, 0]}>
      <mesh castShadow>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color="#7c3aed"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Actual GLB loader ────────────────────────────────────────────────────────

interface ModelLoaderProps {
  url?: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
}

function GLBModel({ url, position = [0, 0, 0], scale = 1 }: Required<ModelLoaderProps>) {
  const { scene } = useGLTF(url);

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  return <primitive object={scene} position={position} scale={scale} />;
}

// ─── Error boundary (catches failed GLB fetches inside Canvas) ────────────────

interface EBState { hasError: boolean }

class GLBErrorBoundary extends Component<{ url: string; children: ReactNode }, EBState> {
  state: EBState = { hasError: false };

  static getDerivedStateFromError(): EBState {
    return { hasError: true };
  }

  // Reset when the user loads a different URL
  static getDerivedStateFromProps(
    props: { url: string },
    state: EBState & { prevUrl?: string },
  ): Partial<EBState & { prevUrl: string }> | null {
    if (state.prevUrl !== props.url) {
      return { hasError: false, prevUrl: props.url };
    }
    return null;
  }

  render() {
    if (this.state.hasError) return <PlaceholderMesh />;
    return this.props.children;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

export default function ModelLoader({
  url,
  position = [0, 0, 0],
  scale = 1,
}: ModelLoaderProps) {
  if (!url) {
    return <PlaceholderMesh />;
  }

  return (
    <GLBErrorBoundary url={url}>
      <Suspense fallback={<PlaceholderMesh />}>
        <GLBModel url={url} position={position} scale={scale} />
      </Suspense>
    </GLBErrorBoundary>
  );
}
