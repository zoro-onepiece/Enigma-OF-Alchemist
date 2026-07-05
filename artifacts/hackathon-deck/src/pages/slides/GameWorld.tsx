export default function GameWorld() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <div className="flex items-center gap-[1.5vw]">
          <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
            The Game World
          </span>
          <span className="text-[1.3vw] tracking-[0.15em] uppercase text-accent border border-[var(--emerald-border)] rounded-sm px-[0.8vw] py-[0.3vh]">
            Implemented
          </span>
        </div>
        <h2 className="font-display font-bold text-[4.6vw] mt-[1.5vh] leading-tight">
          The Island
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <div className="mt-[4vh] flex gap-[3vw] flex-1 min-h-0">
          <div className="w-[38vw] flex flex-col gap-[1.6vh] text-[2.4vw] leading-snug text-text">
            <p>GLB island terrain with automatic bounding-box scaling, enlarged 2.5-3x for exploration</p>
            <p>Grassy-green terrain blending seamlessly into an endless fog-faded horizon</p>
            <p>Blue daytime sky with drifting clouds and distant mountain ranges</p>
            <p>A central temple, GPU-instanced trees, and thousands of grass tufts</p>
            <p>GLB butterflies with animated flight and ambient particle motes</p>
          </div>

          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[1.5vh]">
            <div className="col-span-2 border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1vh]">
              <span className="text-[1.4vw] tracking-[0.15em] uppercase text-muted">
                Screenshot: Wide Island View
              </span>
            </div>
            <div className="border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1vh]">
              <span className="text-[1.3vw] tracking-[0.15em] uppercase text-muted text-center px-[1vw]">
                Screenshot: Temple
              </span>
            </div>
            <div className="border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1vh]">
              <span className="text-[1.3vw] tracking-[0.15em] uppercase text-muted text-center px-[1vw]">
                Screenshot: Horizon
              </span>
            </div>
          </div>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        04 / 12
      </span>
    </div>
  );
}
