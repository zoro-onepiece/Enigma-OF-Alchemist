import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Scene from "@/components/scene/Scene";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const [modelUrl, setModelUrl] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [showStats, setShowStats] = useState(false);

  const handleLoad = () => {
    const trimmed = inputValue.trim();
    setModelUrl(trimmed || "");
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-purple-900/40 bg-[#0f0f1a]/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
            3D
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">Game Boilerplate</h1>
            <p className="text-xs text-purple-400/70 mt-0.5">React Three Fiber</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats toggle */}
          <button
            onClick={() => setShowStats((s) => !s)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-all ${
              showStats
                ? "bg-purple-600/30 border-purple-500 text-purple-300"
                : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
            }`}
          >
            {showStats ? "Stats: ON" : "Stats: OFF"}
          </button>

          {/* Model URL input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              placeholder="Paste .glb URL to load model…"
              className="text-xs bg-white/5 border border-white/10 rounded-md px-3 py-1.5 w-64 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              onClick={handleLoad}
              className="text-xs px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 transition-colors font-medium"
            >
              Load
            </button>
          </div>
        </div>
      </header>

      {/* 3D Canvas */}
      <main className="flex-1 min-h-0">
        <Scene modelUrl={modelUrl || undefined} showStats={showStats} />
      </main>

      {/* Footer info bar */}
      <footer className="shrink-0 px-6 py-2 border-t border-purple-900/30 bg-[#0f0f1a]/60 flex items-center justify-between text-xs text-white/30">
        <div className="flex items-center gap-4">
          <span>@react-three/fiber</span>
          <span>@react-three/drei</span>
          <span>three.js</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-400/60">Web3 auth ready — see <code className="bg-white/5 px-1 rounded">src/components/web3/</code></span>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
