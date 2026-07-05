export default function TechStack() {
  return (
    <div className="slide w-screen h-screen overflow-hidden relative bg-bg text-text font-body">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--panel-soft)] to-bg" />

      <div className="relative h-full w-full flex flex-col pt-[7vh] pl-[6vw] pr-[6vw]">
        <span className="text-[1.4vw] tracking-[0.3em] uppercase text-primary font-semibold">
          Enigma of Alchemist
        </span>
        <h2 className="font-display font-bold text-[4.6vw] mt-[1.5vh] leading-tight">
          Tech Stack
        </h2>
        <div className="mt-[2vh] h-[0.15vh] w-[6vw] bg-primary" />

        <div className="mt-[4.5vh] grid grid-cols-3 gap-x-[3vw] gap-y-[3vh]">
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-accent font-semibold">
              Frontend
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">
              React + Vite + Tailwind CSS
            </p>
          </div>
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-accent font-semibold">
              3D Rendering
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">
              React Three Fiber + drei (Three.js)
            </p>
          </div>
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-accent font-semibold">
              State
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">Zustand</p>
          </div>
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-primary font-semibold">
              Web3 Auth &amp; Wallet
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">
              Magic.link SDK — Email OTP + Google OAuth, Arbitrum Sepolia (chainId
              421614)
            </p>
          </div>
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-primary font-semibold">
              Development
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">
              Replit, AI-assisted agentic workflow
            </p>
          </div>
          <div>
            <span className="text-[1.6vw] tracking-[0.2em] uppercase text-primary font-semibold">
              Assets
            </span>
            <p className="mt-[1vh] text-[2.6vw] leading-snug">
              GLB models via gltf-transform, Draco compression
            </p>
          </div>
        </div>

        <div className="mt-auto mb-[6vh] bg-[var(--panel)] border border-[var(--amber-border)] rounded-sm px-[2.5vw] py-[2.5vh] w-fit">
          <span className="text-[2.8vw] font-display font-semibold text-primary">
            88MB
          </span>
          <span className="text-[2.3vw] text-muted ml-[1vw]">
            of raw GLB models compressed to a fraction of their original size
          </span>
        </div>
      </div>

      <span className="absolute bottom-[3vh] right-[3vw] text-[1.3vw] tracking-widest text-muted/70">
        03 / 12
      </span>
    </div>
  );
}
