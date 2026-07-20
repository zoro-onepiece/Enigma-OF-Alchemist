/**
 * LoadingScreen
 *
 * Suspense fallback for the lazy-loaded <Scene> chunk (see App.jsx — Scene
 * is React.lazy()'d so its ~1.24MB vendor-three chunk + GLB assets only
 * start downloading once the user reaches gameplay, not on initial page
 * load). Same dark stone/amber/emerald alchemy theme as IntroStory/
 * MainMenu, so the wait reads as an intentional part of the game rather
 * than a stalled blank screen.
 *
 * No fabricated percentage — dynamic import() doesn't expose real
 * bytes-loaded progress without extra plumbing (fetch + manual progress
 * tracking) that isn't worth the complexity for a chunk this size; an
 * honest indeterminate shimmer beats a fake number ticking up.
 */
export default function LoadingScreen() {
  return (
    <div className="absolute inset-0 z-[130] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-stone-950 via-emerald-950 to-stone-950 font-serif">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
        <div className="h-[42rem] w-[42rem] animate-spin-slow rounded-full border-2 border-amber-400" />
        <div className="absolute h-[34rem] w-[34rem] rotate-45 border-2 border-emerald-400" />
      </div>

      <span className="mb-6 text-4xl text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.8)]">
        ⚗️
      </span>

      <p className="text-sm uppercase tracking-[0.3em] text-amber-200/90">
        Entering the garden...
      </p>

      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-stone-800/80">
        <div className="h-full w-1/3 animate-loading-shimmer rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      </div>

      <style>{`
        @keyframes loading-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
        .animate-loading-shimmer {
          animation: loading-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
