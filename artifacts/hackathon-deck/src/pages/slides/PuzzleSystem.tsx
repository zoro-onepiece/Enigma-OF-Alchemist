export default function PuzzleSystem() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[6vh] pl-[6vw] pr-[6vw]">
        <div className="flex items-center gap-[1.5vw]">
          <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
            Puzzle System
          </span>
          <span className="text-[1.3vw] tracking-[0.15em] uppercase text-accent border border-[var(--emerald-border)] rounded-sm px-[0.8vw] py-[0.3vh]">
            Core Feature — Implemented
          </span>
        </div>
        <h2 className="font-display font-bold text-[4.2vw] mt-[1.5vh] leading-tight">
          Four Pedestals, Four Mini-Games
        </h2>
        <div className="mt-[1.8vh] h-[0.15vh] w-[6vw] bg-primary" />

        <p className="mt-[3vh] text-[2.3vw] text-muted max-w-[70vw] leading-snug">
          Glowing pedestals spread across the island's quadrants — proximity detection
          on the player's live position triggers "Press E to interact," opening a
          themed modal.
        </p>

        <div className="mt-[3.5vh] grid grid-cols-4 gap-[1.6vw]">
          <div className="bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2vh] flex flex-col gap-[1vh]">
            <span className="text-[1.4vw] text-muted">01</span>
            <span className="text-[2.2vw] font-display font-semibold text-primary leading-tight">
              Rune Memory
            </span>
            <p className="text-[1.9vw] text-muted leading-snug">Simon-says sequences</p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2vh] flex flex-col gap-[1vh]">
            <span className="text-[1.4vw] text-muted">02</span>
            <span className="text-[2.2vw] font-display font-semibold text-primary leading-tight">
              Alchemy Match-3
            </span>
            <p className="text-[1.9vw] text-muted leading-snug">
              Candy-crush style ingredient matching
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2vh] flex flex-col gap-[1vh]">
            <span className="text-[1.4vw] text-muted">03</span>
            <span className="text-[2.2vw] font-display font-semibold text-accent leading-tight">
              Elemental Sudoku
            </span>
            <p className="text-[1.9vw] text-muted leading-snug">
              4x4 grid with alchemical symbols
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2vh] flex flex-col gap-[1vh]">
            <span className="text-[1.4vw] text-muted">04</span>
            <span className="text-[2.2vw] font-display font-semibold text-accent leading-tight">
              Sigil Pairs
            </span>
            <p className="text-[1.9vw] text-muted leading-snug">Memory card matching</p>
          </div>
        </div>

        <div className="mt-auto mb-[5vh] flex items-center gap-[1vw]">
          <div className="h-[0.9vh] w-[0.9vh] rounded-full bg-primary" />
          <p className="text-[2.3vw] text-muted">Win a mini-game → collect an Essence</p>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        08 / 12
      </span>
    </div>
  );
}
