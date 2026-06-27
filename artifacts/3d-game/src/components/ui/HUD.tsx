/**
 * HUD (Heads-Up Display)
 *
 * DOM overlay rendered on top of the 3D Canvas.
 * Never place DOM components inside <Canvas>; keep them here.
 *
 * TODO:
 *   - Wire health/mana/xp from useGameStore
 *   - Add minimap component
 *   - Show active quest objective
 *   - Display wallet address + NFT count from useWallet
 */
import { useGameStore } from "@/store/gameStore";

export default function HUD() {
  const { playerHp, playerMaxHp, playerMana, playerMaxMana, xp, level } =
    useGameStore();

  const hpPct = Math.max(0, (playerHp / playerMaxHp) * 100);
  const manaPct = Math.max(0, (playerMana / playerMaxMana) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10">
      {/* Top-left: health / mana / level */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
        {/* Level badge */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full bg-purple-600 border-2 border-purple-400 flex items-center justify-center text-white text-xs font-bold shadow-lg">
            {level}
          </div>
          <span className="text-white/60 text-xs">Alchemist</span>
        </div>

        {/* HP bar */}
        <div className="w-44">
          <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
            <span>HP</span>
            <span>
              {playerHp}/{playerMaxHp}
            </span>
          </div>
          <div className="h-2.5 bg-black/50 rounded-full border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        {/* Mana bar */}
        <div className="w-44">
          <div className="flex justify-between text-[10px] text-white/50 mb-0.5">
            <span>MP</span>
            <span>
              {playerMana}/{playerMaxMana}
            </span>
          </div>
          <div className="h-2.5 bg-black/50 rounded-full border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${manaPct}%` }}
            />
          </div>
        </div>

        {/* XP */}
        <div className="text-[10px] text-purple-300/60">
          XP: {xp}
        </div>
      </div>

      {/* Bottom-center: action hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/30">
        WASD Move · E Interact · I Inventory · M Map
      </div>
    </div>
  );
}
