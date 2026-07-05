export default function TeamAndClosing() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
          Team &amp; Division of Work
        </span>
        <h2 className="font-display font-bold text-[4.4vw] mt-[1.5vh] leading-tight">
          Who Built What
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <div className="mt-[4.5vh] grid grid-cols-2 gap-[3vw]">
          <div className="bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[3vh] flex flex-col gap-[1.5vh]">
            <span className="text-[2vw] tracking-[0.15em] uppercase text-muted">
              Team Member 1
            </span>
            <span className="text-[2.6vw] font-display font-semibold text-primary">
              [Name]
            </span>
            <p className="text-[2.2vw] text-text leading-snug">
              Character 3D mechanics, animations, movement, camera, Web3 / NFT
              contract integration
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[3vh] flex flex-col gap-[1.5vh]">
            <span className="text-[2vw] tracking-[0.15em] uppercase text-muted">
              Team Member 2 — Me
            </span>
            <span className="text-[2.6vw] font-display font-semibold text-accent">
              [Name]
            </span>
            <p className="text-[2.2vw] text-text leading-snug">
              World and environment building, asset optimization, authentication
              integration, HUD / UI, puzzle system and mini-games
            </p>
          </div>
        </div>

        <div className="mt-auto mb-[6vh] flex items-center gap-[1.2vw]">
          <div className="h-[0.9vh] w-[0.9vh] rounded-full bg-primary" />
          <p className="text-[2.5vw] text-muted">
            Midpoint status: fully playable core loop — login, explore, solve, collect.
            Next: on-chain rewards.
          </p>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        12 / 12
      </span>
    </div>
  );
}
