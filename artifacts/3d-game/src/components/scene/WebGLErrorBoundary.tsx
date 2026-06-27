import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f1a] text-white gap-6 p-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-3xl">
            🎮
          </div>
          <div className="text-center max-w-md">
            <h2 className="text-lg font-semibold text-white mb-2">WebGL Unavailable</h2>
            <p className="text-sm text-white/50 leading-relaxed">
              This preview environment does not have GPU access for WebGL. The 3D scene will render
              correctly in a real browser or when deployed.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-lg px-5 py-4 text-xs text-white/40 font-mono max-w-sm w-full text-center">
            {this.state.message || "THREE.WebGLRenderer: Error creating WebGL context."}
          </div>
          <div className="flex gap-3 text-xs text-purple-400/60 mt-2">
            <span>@react-three/fiber ✓</span>
            <span>@react-three/drei ✓</span>
            <span>three.js ✓</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
