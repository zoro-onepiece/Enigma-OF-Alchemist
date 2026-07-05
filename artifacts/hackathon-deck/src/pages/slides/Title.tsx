export default function Title() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--panel-soft)] via-bg to-bg" />

      <svg
        className="absolute -top-[8vw] -right-[8vw] opacity-20"
        width="42vw"
        height="42vw"
        viewBox="0 0 400 400"
      >
        <circle cx="200" cy="200" r="180" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="#10b981" strokeWidth="1" />
        <polygon
          points="200,60 322,270 78,270"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.2"
        />
        <polygon
          points="200,340 78,130 322,130"
          fill="none"
          stroke="#10b981"
          strokeWidth="1"
        />
      </svg>

      <div className="relative h-full w-full flex flex-col justify-center pl-[7vw] pr-[38vw]">
        <div className="flex items-center gap-[1vw] mb-[3vh]">
          <div className="h-[0.15vh] w-[3.5vw] bg-primary" />
          <span className="text-[1.6vw] tracking-[0.35em] uppercase text-primary font-semibold">
            Hackathon Midpoint Presentation
          </span>
        </div>

        <h1 className="font-display font-bold text-[6.5vw] leading-[1.02] text-text text-wrap-pretty">
          Enigma of Alchemist
        </h1>

        <p className="mt-[3vh] text-[2.6vw] text-muted font-medium max-w-[42vw] text-wrap-pretty">
          A 3D Web3 Puzzle / Adventure Game on Arbitrum Sepolia
        </p>

        <div className="mt-[6vh] flex items-center gap-[1vw]">
          <div className="h-[0.9vh] w-[0.9vh] rounded-full bg-accent" />
          <span className="text-[1.5vw] tracking-[0.15em] uppercase text-muted">
            Team Members: [Names]
          </span>
        </div>
      </div>

      <div className="absolute bottom-[6vh] right-[6vw] w-[26vw] h-[24vh] border-2 border-dashed border-[var(--amber-border)] bg-[var(--panel)]/70 rounded-sm flex flex-col items-center justify-center gap-[1.5vh]">
        <svg width="3.2vw" height="3.2vw" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="4" width="20" height="16" rx="1.5" stroke="#a89f8c" strokeWidth="1.4" />
          <circle cx="8" cy="10" r="2" stroke="#a89f8c" strokeWidth="1.4" />
          <path d="M3 17l5-5 4 4 3-3 6 6" stroke="#a89f8c" strokeWidth="1.4" />
        </svg>
        <span className="text-[1.4vw] tracking-[0.15em] uppercase text-muted text-center px-[1vw]">
          Screenshot: Main Menu
        </span>
      </div>
    </div>
  );
}
