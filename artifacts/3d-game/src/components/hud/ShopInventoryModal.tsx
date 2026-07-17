/**
 * ShopInventoryModal
 *
 * DOM overlay opened by walking up to the Merchant and pressing E (see
 * Merchant.tsx). Two tabs:
 *   - Shop: the 3 purchasable skins; "Buy" drives the x402 handshake against
 *     POST /api/merchant/checkout (see that route for the 402 challenge /
 *     X-PAYMENT settle flow).
 *   - Inventory: skins already owned; "Equip" swaps the store's
 *     equippedSkin, which Player.tsx reads to pick the active GLB.
 *
 * TODO:
 *   - Replace the placeholder X-PAYMENT header below with a real signed
 *     payment authorization from the player's Magic/Openfort embedded
 *     wallet once the client-side x402 facilitator call is wired up
 */
import { useState } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
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

// Must match EnigmaRelics.sol's skinPrices, the checkout route's
// SKIN_PRICES_WEI, and Player.tsx's SKIN_MODEL_PATHS.
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

interface ShopInventoryModalProps {
  playerAddress: string | null;
  onClose: () => void;
}

export default function ShopInventoryModal({ playerAddress, onClose }: ShopInventoryModalProps) {
  const ownedSkins = useGameStore((s) => s.ownedSkins);
  const equippedSkin = useGameStore((s) => s.equippedSkin);
  const purchaseSkin = useGameStore((s) => s.purchaseSkin);
  const equipSkin = useGameStore((s) => s.equipSkin);

  const [pendingSkinId, setPendingSkinId] = useState<SkinId | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Only ONE live GLB preview canvas ever exists at a time (hover-driven),
  // rather than one per row — mounting 3 simultaneous WebGL contexts for
  // small thumbnails was hitting the browser's context budget and causing
  // "WebGLRenderer: Context Lost" (which is also why the per-row thumbnails
  // rendered as solid black squares instead of the actual model).
  const [previewSkinId, setPreviewSkinId] = useState<SkinId>(SKINS[0].id);
  const previewSkin = SKINS.find((s) => s.id === previewSkinId) ?? SKINS[0];

  // The API server only answers under the reverse proxy (see CLAUDE.md:
  // "always hit services through the proxy... never a raw service port
  // directly") — hitting Vite's own dev port directly returns a plain 404
  // with no body. `res.json()` on that throws a cryptic "Unexpected end of
  // JSON input" that masks the real problem, so parse defensively and
  // surface a readable message either way.
  async function parseJsonSafe(res: Response): Promise<{ error?: string; success?: boolean }> {
    const text = await res.text();
    if (!text) return { error: `${res.status} ${res.statusText || "No response body"}` };
    try {
      return JSON.parse(text);
    } catch {
      return { error: `${res.status}: unexpected non-JSON response` };
    }
  }

  // async function handleBuy(skinId: SkinId) {
  //   if (!playerAddress) {
  //     setError("Connect your wallet before buying a skin.");
  //     return;
  //   }
  //   setPendingSkinId(skinId);
  //   setError(null);
  //   try {
  //     // Step 1: challenge — expect a 402 with x402 payment requirements.
  //     const challenge = await fetch("/api/merchant/checkout", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ skinId, playerAddress }),
  //     });

  //     if (challenge.status === 402) {
  //       // Step 2: settle. TODO: sign the returned `accepts` requirement with
  //       // the player's wallet instead of this placeholder header.
  //       const settle = await fetch("/api/merchant/checkout", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //           "X-PAYMENT": "placeholder-payment-authorization",
  //         },
  //         body: JSON.stringify({ skinId, playerAddress }),
  //       });
  //       const data = await parseJsonSafe(settle);
  //       if (!settle.ok || !data.success) throw new Error(data.error ?? "Checkout failed");
  //       purchaseSkin(skinId);
  //     } else {
  //       const data = await parseJsonSafe(challenge);
  //       throw new Error(data.error ?? "Unexpected checkout response");
  //     }
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : "Purchase failed");
  //   } finally {
  //     setPendingSkinId(null);
  //   }
  // }

  async function handleBuy(skinId: SkinId) {
  // TEMP: bypass real checkout API for local testing without deployed
  // contract / test ETH. Directly mark as owned, same effect as a
  // successful checkout. Remove this bypass once /api/merchant/checkout
  // is reachable (through the proxy) and the real x402 flow is tested.
  purchaseSkin(skinId);
  console.log(`✅ [TEST] Marked skin ${skinId} as owned (checkout bypassed)`);

  /* ORIGINAL REAL CHECKOUT LOGIC — restore this once proxy/contract ready:
  if (!playerAddress) {
    setError("Connect your wallet before buying a skin.");
    return;
  }
  setPendingSkinId(skinId);
  setError(null);
  try {
    const challenge = await fetch("/api/merchant/checkout", { ... });
    ...
  } catch (err) {
    setError(err instanceof Error ? err.message : "Purchase failed");
  } finally {
    setPendingSkinId(null);
  }
  */
}
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 font-serif backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-600/70 bg-gradient-to-b from-stone-900 to-emerald-950 p-5 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-wide text-amber-100">🜛 Merchant</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-amber-600/60 px-2 py-1 text-xs text-amber-200 hover:bg-amber-500/10"
          >
            Close
          </button>
        </div>

        {/* Single shared live-GLB preview — swaps to whichever skin is
            hovered below (see previewSkinId above). `key` forces a clean
            unmount/remount of the one Canvas instead of ever having two
            alive during a switch. */}
        <div className="mx-auto mb-3 h-24 w-24 overflow-hidden rounded-xl border-2 border-amber-600/60 bg-black/40">
          <SkinThumbnail key={previewSkin.id} modelPath={previewSkin.modelPath} />
        </div>
        <p className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-amber-300/70">
          {previewSkin.name}
        </p>

        <TabsPrimitive.Root defaultValue="shop">
          <TabsPrimitive.List className="mb-4 flex gap-1 rounded-lg border border-amber-700/50 bg-stone-950/60 p-1">
            <TabsPrimitive.Trigger
              value="shop"
              className="flex-1 rounded-md py-1.5 text-sm text-amber-200/80 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-100"
            >
              Shop
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="inventory"
              className="flex-1 rounded-md py-1.5 text-sm text-amber-200/80 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-100"
            >
              Inventory
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>

          <TabsPrimitive.Content value="shop" className="space-y-2">
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
                    disabled={owned || pendingSkinId === skin.id}
                    onClick={() => handleBuy(skin.id)}
                    className="rounded-md border border-amber-500/70 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
                  >
                    {owned ? "Owned" : pendingSkinId === skin.id ? "Buying…" : "Buy"}
                  </button>
                </div>
              );
            })}
            {error && <p className="text-xs text-red-400">{error}</p>}
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="inventory" className="space-y-2">
            {SKINS.filter((skin) => ownedSkins.has(skin.id)).length === 0 && (
              <p className="text-sm text-stone-400">No skins owned yet — visit the Shop tab.</p>
            )}
            {SKINS.filter((skin) => ownedSkins.has(skin.id)).map((skin) => {
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
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </div>
    </div>
  );
}
