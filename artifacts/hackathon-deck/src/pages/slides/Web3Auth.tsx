export default function Web3Auth() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <div className="flex items-center gap-[1.5vw]">
          <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
            Web3 Authentication
          </span>
          <span className="text-[1.3vw] tracking-[0.15em] uppercase text-accent border border-[var(--emerald-border)] rounded-sm px-[0.8vw] py-[0.3vh]">
            Implemented
          </span>
        </div>
        <h2 className="font-display font-bold text-[4.4vw] mt-[1.5vh] leading-tight">
          Login Creates a Wallet
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <div className="mt-[4vh] flex gap-[3vw] flex-1 min-h-0">
          <div className="w-[36vw] flex flex-col gap-[1.8vh] text-[2.4vw] leading-snug">
            <p>Magic.link integration: Email OTP and Google OAuth in one flow — new users get an account and wallet automatically</p>
            <p>Wallet created on Arbitrum Sepolia, address shown live in the game HUD</p>
            <p>Session persistence across refreshes</p>
            <p>Developer bypass mode (dev builds only) for team testing</p>
          </div>

          <div className="flex-1 flex flex-col gap-[2vh]">
            <div className="flex-1 border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1vh]">
              <span className="text-[1.4vw] tracking-[0.15em] uppercase text-muted">
                Screenshot: Login Screen
              </span>
            </div>
            <div className="flex-1 border-2 border-dashed border-[var(--emerald-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1vh]">
              <span className="text-[1.4vw] tracking-[0.15em] uppercase text-muted">
                Screenshot: HUD with 0x Address
              </span>
            </div>
          </div>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        06 / 12
      </span>
    </div>
  );
}
