/**
 * LockerModal
 *
 * Standalone "what do I own" overlay — togglable via the "I" key or a HUD
 * button (see Scene.tsx / GameHUD.tsx), independent of Merchant proximity.
 * Two tabs:
 *   - Skins: purchased skins (see MerchantShop.tsx for buying); "Equip"
 *     swaps gameStore.equippedSkin, which Player.tsx reads to pick the
 *     active GLB.
 *   - Relics: puzzle-reward NFTs actually minted via /api/rewards/mint
 *     (see gameStore.mintPuzzleReward, wired from Scene.tsx on puzzle solve).
 */
import { useState } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { useGameStore } from "../../store/gameStore";
import type { SkinId } from "../../store/gameStore";
import SkinThumbnail from "./SkinThumbnail";

interface Skin {
  id: SkinId;
  name: string;
  modelPath: string;
  swatch: string;
}

const SKINS: Skin[] = [
  { id: 1, name: "Crimson Flare", modelPath: "/models/player_red.glb", swatch: "from-red-500 to-red-800" },
  { id: 2, name: "Amber Ember", modelPath: "/models/player_orange.glb", swatch: "from-orange-400 to-orange-700" },
  { id: 3, name: "Mystic Amethyst", modelPath: "/models/player_purple.glb", swatch: "from-purple-400 to-purple-800" },
];

interface LockerModalProps {
  onClose: () => void;
}

export default function LockerModal({ onClose }: LockerModalProps) {
  const ownedSkins = useGameStore((s) => s.ownedSkins);
  const equippedSkin = useGameStore((s) => s.equippedSkin);
  const equipSkin = useGameStore((s) => s.equipSkin);
  const ownedRelics = useGameStore((s) => s.ownedRelics);

  const ownedSkinList = SKINS.filter((skin) => ownedSkins.has(skin.id));
  const [previewSkinId, setPreviewSkinId] = useState<SkinId | null>(ownedSkinList[0]?.id ?? null);
  const previewSkin = SKINS.find((s) => s.id === previewSkinId) ?? null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 font-serif backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-600/70 bg-gradient-to-b from-stone-900 to-emerald-950 p-5 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wide text-amber-100">🎒 Locker</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-amber-600/60 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
          >
            Close
          </button>
        </div>

        <TabsPrimitive.Root defaultValue="skins">
          <TabsPrimitive.List className="mb-4 flex gap-1 rounded-lg border border-amber-700/50 bg-stone-950/60 p-1">
            <TabsPrimitive.Trigger
              value="skins"
              className="flex-1 rounded-md py-1.5 text-sm text-amber-200/80 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-100"
            >
              Skins
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="relics"
              className="flex-1 rounded-md py-1.5 text-sm text-amber-200/80 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-100"
            >
              Relics
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

          <TabsPrimitive.Content value="skins">
            {previewSkin && (
              <>
                <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-xl border-2 border-amber-600/60 bg-black/40">
                  <SkinThumbnail key={previewSkin.id} modelPath={previewSkin.modelPath} />
                </div>
                <p className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-amber-300/70">
                  {previewSkin.name}
                </p>
              </>
            )}

            <div className="space-y-2">
              {ownedSkinList.length === 0 && (
                <p className="text-sm text-stone-400">
                  No skins owned yet — visit the Merchant to buy some.
                </p>
              )}
              {ownedSkinList.map((skin) => {
                const equipped = equippedSkin === skin.id;
                return (
                  <div
                    key={skin.id}
                    onMouseEnter={() => setPreviewSkinId(skin.id)}
                    onFocus={() => setPreviewSkinId(skin.id)}
                    className="flex items-center justify-between rounded-lg border border-amber-700/40 bg-stone-900/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-10 w-10 shrink-0 rounded-lg border border-amber-700/50 bg-gradient-to-br ${skin.swatch}`}
                      />
                      <span className="text-sm font-semibold text-amber-100">{skin.name}</span>
                    </div>
                    <button
                      disabled={equipped}
                      onClick={() => equipSkin(skin.id)}
                      className="rounded-md border border-emerald-500/70 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 disabled:opacity-50"
                    >
                      {equipped ? "Equipped" : "Equip"}
                    </button>
                  </div>
                );
              })}
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="relics" className="space-y-2">
            {ownedRelics.length === 0 && (
              <p className="text-sm text-stone-400">
                No relics minted yet — solve a shrine's puzzle to earn one.
              </p>
            )}
            {ownedRelics.map((relic) => (
              <div
                key={relic.puzzleId}
                className="flex items-center gap-3 rounded-lg border border-amber-700/40 bg-stone-900/60 px-3 py-2"
              >
                <img
                  src={relic.image}
                  alt={relic.name}
                  className="h-12 w-12 shrink-0 rounded-lg border border-amber-700/50 bg-black/40 object-cover"
                  onError={(e) => {
                    // Relic artwork (public/relics/*.png) may not exist yet —
                    // fall back to a plain sigil rather than a broken image icon.
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div>
                  <div className="text-sm font-semibold text-amber-100">{relic.name}</div>
                  <div className="text-xs text-emerald-300/80">Minted on-chain</div>
                </div>
              </div>
            ))}
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </div>
    </div>
  );
}
