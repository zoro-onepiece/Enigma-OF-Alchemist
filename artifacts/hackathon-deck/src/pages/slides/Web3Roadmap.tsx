export default function Web3Roadmap() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <div className="flex items-center gap-[1.5vw]">
          <span className="text-[1.4vw] tracking-[0.3em] uppercase text-accent font-semibold">
            Web3 Roadmap
          </span>
          <span className="text-[1.3vw] tracking-[0.15em] uppercase text-primary border border-[var(--amber-border)] rounded-sm px-[0.8vw] py-[0.3vh]">
            Next Phase
          </span>
        </div>
        <h2 className="font-display font-bold text-[4.4vw] mt-[1.5vh] leading-tight">
          From Hooks to On-Chain Rewards
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-accent" />

        <div className="mt-[5vh] flex gap-[3vw]">
          <div className="flex-1 bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[3vh] flex flex-col gap-[1.5vh]">
            <span className="text-[1.5vw] tracking-[0.2em] uppercase text-accent font-semibold">
              Already in Place
            </span>
            <p className="text-[2.4vw] leading-snug">
              NFT minting hooks fire on every solve and finale
            </p>
            <p className="text-[2vw] text-muted leading-snug">
              onEssenceEarned and onEnigmaComplete
            </p>
          </div>

          <div className="flex-1 bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[3vh] flex flex-col gap-[1.5vh]">
            <span className="text-[1.5vw] tracking-[0.2em] uppercase text-primary font-semibold">
              Next
            </span>
            <p className="text-[2.4vw] leading-snug">
              Smart contract on Arbitrum Sepolia
            </p>
            <p className="text-[2vw] text-muted leading-snug">
              Mints an Essence NFT per puzzle and a completion NFT to the player's
              Magic wallet
            </p>
          </div>

          <div className="flex-1 bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[3vh] flex flex-col gap-[1.5vh]">
            <span className="text-[1.5vw] tracking-[0.2em] uppercase text-primary font-semibold">
              Then
            </span>
            <p className="text-[2.4vw] leading-snug">Inventory viewing</p>
            <p className="text-[2vw] text-muted leading-snug">
              Players can view their owned NFTs
            </p>
          </div>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        10 / 12
      </span>
    </div>
  );
}
