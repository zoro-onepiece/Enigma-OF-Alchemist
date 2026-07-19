/**
 * MerchantShop
 *
 * Shop-only DOM overlay — opened exclusively by walking up to the Merchant
 * and pressing E (see Merchant.tsx -> gameStore.openShop). Lists the 3
 * purchasable skins; "Buy" drives the real x402 handshake against
 * POST /api/merchant/checkout via gameStore.buySkin (see that action and
 * the route itself for the 402 challenge / X-PAYMENT settle flow).
 *
 * Owned/equip management lives in the separate LockerModal.tsx, opened
 * independently via the "I" key or a HUD button.
 */
import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import type { SkinId } from "../../store/gameStore";
import SkinThumbnail from "./SkinThumbnail";

interface Skin {
  id: SkinId;
  name: string;
  priceEth: string;
  modelPath: string;
  swatch: string;
}

// Must match EnigmaRelics.sol's skinPrices and the checkout route's
// SKIN_PRICES_WEI.
const SKINS: Skin[] = [
  {
    id: 1,
    name: "Crimson Flare",
    priceEth: "0.001",
    modelPath: "/models/player_red.glb",
    swatch: "from-red-500 to-red-800",
  },
  {
    id: 2,
    name: "Amber Ember",
    priceEth: "0.001",
    modelPath: "/models/player_orange.glb",
    swatch: "from-orange-400 to-orange-700",
  },
  {
    id: 3,
    name: "Mystic Amethyst",
    priceEth: "0.002",
    modelPath: "/models/player_purple.glb",
    swatch: "from-purple-400 to-purple-800",
  },
];

interface MerchantShopProps {
  playerAddress: string | null;
  onClose: () => void;
}

export default function MerchantShop({ playerAddress, onClose }: MerchantShopProps) {
  const ownedSkins = useGameStore((s) => s.ownedSkins);
  const buySkin = useGameStore((s) => s.buySkin);
  const purchaseError = useGameStore((s) => s.skinPurchaseError);

  const [pendingSkinId, setPendingSkinId] = useState<SkinId | null>(null);
  // Only ONE live GLB preview canvas ever exists at a time (hover-driven),
  // rather than one per row — mounting simultaneous WebGL contexts for
  // small thumbnails hits the browser's context budget (see SkinThumbnail).
  const [previewSkinId, setPreviewSkinId] = useState<SkinId>(SKINS[0].id);
  const previewSkin = SKINS.find((s) => s.id === previewSkinId) ?? SKINS[0];

  async function handleBuy(skinId: SkinId) {
    if (!playerAddress) return;
    setPendingSkinId(skinId);
    await buySkin(skinId, playerAddress);
    setPendingSkinId(null);
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 font-serif backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-600/70 bg-gradient-to-b from-stone-900 to-emerald-950 p-5 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wide text-amber-100">🜛 Merchant Shop</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-amber-600/60 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
          >
            Close
          </button>
        </div>

        {/* Single shared live-GLB preview — swaps to whichever skin is
            hovered below. `key` forces a clean unmount/remount of the one
            Canvas instead of ever having two alive during a switch. */}
        <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-xl border-2 border-amber-600/60 bg-black/40">
          <SkinThumbnail key={previewSkin.id} modelPath={previewSkin.modelPath} />
        </div>
        <p className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-amber-300/70">
          {previewSkin.name}
        </p>

        {!playerAddress && (
          <p className="mb-3 text-center text-xs text-amber-300/80">
            Connect your wallet to purchase skins.
          </p>
        )}

        <div className="space-y-2">
          {SKINS.map((skin) => {
            const owned = ownedSkins.has(skin.id);
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
                  <div>
                    <div className="text-sm font-semibold text-amber-100">{skin.name}</div>
                    <div className="text-xs text-emerald-300/80">{skin.priceEth} ETH</div>
                  </div>
                </div>
                <button
                  disabled={owned || !playerAddress || pendingSkinId === skin.id}
                  onClick={() => handleBuy(skin.id)}
                  className="rounded-md border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
                >
                  {owned ? "Owned" : pendingSkinId === skin.id ? "Buying…" : "Buy"}
                </button>
              </div>
            );
          })}
          {purchaseError && <p className="text-xs text-red-400">{purchaseError}</p>}
        </div>
      </div>
    </div>
  );
}
