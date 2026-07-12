/**
 * MinimapOverlay
 *
 * Task D: toggleable top-down 2D map — temple at center, the 4 puzzle
 * pedestals as dots (gold once solved, their real pedestal color while
 * not), the mushroom merchant as a distinct marker, and the player's live
 * position + facing as a distinct marker.
 * A plain SVG, not a literal top-down camera render.
 *
 * Reuses the exact same world coordinates gameplay already uses instead of
 * a second hand-maintained layout: TEMPLE_POSITION/PUZZLE_PLACEMENTS from
 * GameEnvironment.tsx, MERCHANT_POSITION from Merchant.tsx,
 * BOUNDARY_RADIUS from worldCollision.ts, and
 * PLAYER_WORLD_POS/PLAYER_WORLD_ROT from Player.tsx (the same mutable
 * refs Player.tsx's own useFrame writes every frame — polled here via
 * requestAnimationFrame since this is a plain DOM component, not an R3F
 * child, so it has no useFrame of its own).
 */
import { useEffect, useState } from "react";
import { PLAYER_WORLD_POS, PLAYER_WORLD_ROT } from "../3d/Player";
import { MERCHANT_POSITION } from "../3d/Merchant";
import {
  TEMPLE_POSITION,
  PUZZLE_PLACEMENTS,
} from "../scene/environment/GameEnvironment";
import {
  SOLVED_COLOR,
  DEFAULT_PUZZLE_COLOR,
} from "../scene/environment/GlowingPuzzle";
import { BOUNDARY_RADIUS } from "../../lib/worldCollision";
import { useGameStore } from "../../store/gameStore";

export interface MinimapOverlayProps {
  onClose: () => void;
}

const MAP_PX = 200;
const VIEW_HALF = 100; // svg units, half-extent of the viewBox
const SCALE = VIEW_HALF / BOUNDARY_RADIUS;

function toMap(worldX: number, worldZ: number) {
  return { x: worldX * SCALE, y: worldZ * SCALE };
}

export default function MinimapOverlay({ onClose }: MinimapOverlayProps) {
  const solved = useGameStore((s) => s.puzzle.solved);
  const [player, setPlayer] = useState({ x: 0, z: 0, rotY: 0 });

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setPlayer({
        x: PLAYER_WORLD_POS.x,
        z: PLAYER_WORLD_POS.z,
        rotY: PLAYER_WORLD_ROT.y,
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const temple = toMap(TEMPLE_POSITION[0], TEMPLE_POSITION[2]);
  const merchant = toMap(MERCHANT_POSITION[0], MERCHANT_POSITION[2]);
  const playerMap = toMap(player.x, player.z);

  // Facing arrow built directly from the (sin, cos) unit vector Player.tsx
  // already uses for rotation.y (see its atan2(moveDir.x, moveDir.z)) —
  // constructing the triangle's points from this vector directly avoids any
  // ambiguity around SVG's rotate() clockwise/counter-clockwise convention.
  const fx = Math.sin(player.rotY);
  const fy = Math.cos(player.rotY);
  const px = -fy;
  const py = fx;
  const tip = { x: playerMap.x + fx * 6, y: playerMap.y + fy * 6 };
  const backLeft = {
    x: playerMap.x - fx * 3 + px * 3.5,
    y: playerMap.y - fy * 3 + py * 3.5,
  };
  const backRight = {
    x: playerMap.x - fx * 3 - px * 3.5,
    y: playerMap.y - fy * 3 - py * 3.5,
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-[65] flex justify-center px-4 sm:top-24">
      <div className="pointer-events-auto relative rounded-2xl border-2 border-amber-600/70 bg-stone-950/90 p-2.5 shadow-[0_0_24px_rgba(0,0,0,0.6)] backdrop-blur-sm sm:p-3">
        <div className="mb-1 flex items-center justify-between gap-6">
          <span className="text-[9px] uppercase tracking-[0.2em] text-amber-300/80 sm:text-[10px] sm:tracking-[0.25em]">
            Garden Map
          </span>
          <button
            onClick={onClose}
            className="text-sm leading-none text-white/40 transition-colors hover:text-white/80"
            aria-label="Close map"
          >
            ×
          </button>
        </div>

        <svg
          width={MAP_PX}
          height={MAP_PX}
          viewBox={`-${VIEW_HALF} -${VIEW_HALF} ${VIEW_HALF * 2} ${VIEW_HALF * 2}`}
          className="max-w-[45vw] rounded-lg bg-emerald-950/70 sm:max-w-none"
        >
          <circle
            cx={0}
            cy={0}
            r={VIEW_HALF - 2}
            fill="none"
            stroke="#4ade8055"
            strokeWidth={1}
          />

          {/* Temple */}
          <rect
            x={temple.x - 7}
            y={temple.y - 5}
            width={14}
            height={10}
            fill="#b8302e"
            stroke="#ffd700"
            strokeWidth={0.8}
          />

          {/* Puzzle pedestals */}
          {PUZZLE_PLACEMENTS.map(({ id, position }) => {
            const m = toMap(position[0], position[2]);
            const isSolved = solved.has(id);
            return (
              <circle
                key={id}
                cx={m.x}
                cy={m.y}
                r={3.4}
                fill={isSolved ? SOLVED_COLOR : DEFAULT_PUZZLE_COLOR}
                stroke="#00000066"
                strokeWidth={0.6}
              />
            );
          })}

          {/* Mushroom Merchant — distinct marker so players know where the
              cosmetic shop is. Rendered as a small mushroom emoji via a
              <text> element so it's instantly recognizable at a glance,
              unlike the plain colored dots used for puzzles. */}
          <text
            x={merchant.x}
            y={merchant.y}
            fontSize={9}
            textAnchor="middle"
            dominantBaseline="central"
          >
            🍄
          </text>

          {/* Player — distinct marker showing live position + facing */}
          <polygon
            points={`${tip.x},${tip.y} ${backLeft.x},${backLeft.y} ${backRight.x},${backRight.y}`}
            fill="#38bdf8"
            stroke="#0c4a6e"
            strokeWidth={0.6}
          />
        </svg>
      </div>
    </div>
  );
}
