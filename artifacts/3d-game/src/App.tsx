import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Scene from "@/components/scene/Scene";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a14] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-purple-900/40 bg-[#0f0f1a]/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
            ⚗️
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">Enigma of Alchemist</h1>
            <p className="text-xs text-purple-400/70 mt-0.5">React Three Fiber · Arbitrum Sepolia</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* 3D Canvas — fills the remaining height */}
      <main className="flex-1 min-h-0">
        <Scene showStats={showStats} />
      </main>
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
