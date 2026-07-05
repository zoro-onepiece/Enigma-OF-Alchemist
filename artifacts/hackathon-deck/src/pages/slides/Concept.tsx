export default function Concept() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
          Enigma of Alchemist
        </span>
        <h2 className="font-display font-bold text-[4.6vw] mt-[1.5vh] leading-tight">
          Concept
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <p className="mt-[4vh] text-[3.1vw] leading-relaxed max-w-[70vw] text-wrap-pretty">
          A third-person 3D puzzle and adventure game where players explore a fantasy
          island, solve four alchemical puzzle challenges to collect Essences, and earn
          blockchain-backed rewards on the Arbitrum Sepolia testnet.
        </p>

        <div className="mt-[5vh] flex gap-[2.5vw]">
          <div className="flex-1 bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2.5vh]">
            <span className="text-[2.6vw] font-display font-semibold text-primary">Explore</span>
            <p className="mt-[1vh] text-[2.3vw] text-muted leading-snug">
              A fantasy island, on foot
            </p>
          </div>
          <div className="flex-1 bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2.5vh]">
            <span className="text-[2.6vw] font-display font-semibold text-primary">Solve</span>
            <p className="mt-[1vh] text-[2.3vw] text-muted leading-snug">
              Four alchemical puzzle challenges
            </p>
          </div>
          <div className="flex-1 bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2.5vh]">
            <span className="text-[2.6vw] font-display font-semibold text-accent">Collect</span>
            <p className="mt-[1vh] text-[2.3vw] text-muted leading-snug">
              Essences with real rewards
            </p>
          </div>
          <div className="flex-1 bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2.5vh]">
            <span className="text-[2.6vw] font-display font-semibold text-accent">Earn</span>
            <p className="mt-[1vh] text-[2.3vw] text-muted leading-snug">
              NFTs on Arbitrum Sepolia
            </p>
          </div>
        </div>

        <div className="mt-[5vh] flex items-center gap-[1vw]">
          <div className="h-[0.9vh] w-[0.9vh] rounded-full bg-accent" />
          <p className="text-[2.5vw] text-muted">
            Login creates a Web3 wallet automatically — no crypto knowledge needed.
          </p>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        02 / 12
      </span>
    </div>
  );
}
