export default function ChallengesSolved() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
          Challenges Solved
        </span>
        <h2 className="font-display font-bold text-[4.4vw] mt-[1.5vh] leading-tight">
          Problems We Ran Into
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <div className="mt-[4.5vh] grid grid-cols-2 gap-[2.5vw]">
          <div className="bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2.5vh] flex flex-col gap-[1.2vh]">
            <span className="text-[2.5vw] font-display font-semibold text-primary leading-tight">
              Asset Weight
            </span>
            <p className="text-[2.1vw] text-muted leading-snug">
              88MB of raw GLB assets, Draco-compressed and instanced — a 2,712-mesh
              forest scene handled with GPU instancing
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2.5vh] flex flex-col gap-[1.2vh]">
            <span className="text-[2.5vw] font-display font-semibold text-accent leading-tight">
              OAuth Reliability
            </span>
            <p className="text-[2.1vw] text-muted leading-snug">
              Google OAuth redirect-loop debugging — React StrictMode double-effects
              fixed with a singleton promise, plus a switch to Email OTP
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm p-[2.5vh] flex flex-col gap-[1.2vh]">
            <span className="text-[2.5vw] font-display font-semibold text-primary leading-tight">
              Scale Mismatches
            </span>
            <p className="text-[2.1vw] text-muted leading-snug">
              FBX-exported models didn't match the character's scale — solved with an
              auto-fit bounding-box loader
            </p>
          </div>
          <div className="bg-[var(--panel)] border border-[var(--emerald-border)] rounded-sm p-[2.5vh] flex flex-col gap-[1.2vh]">
            <span className="text-[2.5vw] font-display font-semibold text-accent leading-tight">
              Collision Without a Physics Engine
            </span>
            <p className="text-[2.1vw] text-muted leading-snug">
              Cylinder-based collision keeps the character out of trees and objects
            </p>
          </div>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        11 / 12
      </span>
    </div>
  );
}
