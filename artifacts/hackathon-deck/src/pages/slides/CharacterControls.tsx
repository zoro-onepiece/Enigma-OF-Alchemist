export default function CharacterControls() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex">
        <div className="w-[45vw] flex flex-col pt-[7vh] pl-[6vw] pr-[3vw]">
          <div className="flex items-center gap-[1.5vw]">
            <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
              Character &amp; Controls
            </span>
            <span className="text-[1.3vw] tracking-[0.15em] uppercase text-accent border border-[var(--emerald-border)] rounded-sm px-[0.8vw] py-[0.3vh]">
              Implemented
            </span>
          </div>
          <h2 className="font-display font-bold text-[4.4vw] mt-[1.5vh] leading-tight">
            Moving Through the World
          </h2>
          <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

          <div className="mt-[4vh] flex flex-col gap-[2.2vh] text-[2.5vw] leading-snug">
            <p>Animated anime-style character built with a GLB model and useAnimations</p>
            <p>WASD movement with a mouse-orbit third-person camera and zoom</p>
            <p>Cylinder-based collision keeps the character from passing through trees and objects</p>
            <p>A circular boundary keeps the player within the playable area</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-[6vh]">
          <div className="w-full h-full border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1.5vh]">
            <svg width="3.2vw" height="3.2vw" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="4" width="20" height="16" rx="1.5" stroke="#a89f8c" strokeWidth="1.4" />
              <circle cx="8" cy="10" r="2" stroke="#a89f8c" strokeWidth="1.4" />
              <path d="M3 17l5-5 4 4 3-3 6 6" stroke="#a89f8c" strokeWidth="1.4" />
            </svg>
            <span className="text-[1.5vw] tracking-[0.15em] uppercase text-muted">
              Screenshot: Character in World
            </span>
          </div>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        05 / 12
      </span>
    </div>
  );
}
