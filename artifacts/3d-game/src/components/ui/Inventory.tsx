/**
 * Inventory
 *
 * DOM overlay showing the player's on-chain NFT items.
 * Opens via 'I' key or inventory button in HUD.
 *
 * TODO:
 *   - Fetch NFTs from Openfort / Arbitrum Sepolia with useNFTs hook
 *   - Display NFT metadata (image, name, rarity, traits)
 *   - Allow equipping items (write txn via Openfort gasless)
 *   - Add drag-and-drop equip slots
 */
import { useGameStore } from "@/store/gameStore";
import { useNFTs } from "@/hooks/useNFTs";

interface InventoryProps {
  onClose: () => void;
}

export default function Inventory({ onClose }: InventoryProps) {
  const { closeInventory } = useGameStore();
  const { nfts, isLoading } = useNFTs();

  const handleClose = () => {
    closeInventory();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f0f1a] border border-purple-800/50 rounded-2xl p-6 w-[540px] max-w-full mx-4 shadow-2xl shadow-purple-900/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-semibold">Inventory</h2>
            <p className="text-white/30 text-xs mt-0.5">
              {nfts.length} item{nfts.length !== 1 ? "s" : ""} collected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-white/30 text-sm">
            Loading items…
          </div>
        ) : nfts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 text-white/30">
            <span className="text-4xl">🧪</span>
            <p className="text-sm">No items yet — solve puzzles to mint NFTs!</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {nfts.map((nft) => (
              <div
                key={nft.tokenId}
                className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col items-center gap-1 hover:border-purple-500/50 cursor-pointer transition-colors"
                title={nft.name}
              >
                {nft.image ? (
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="w-14 h-14 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-purple-900/40 flex items-center justify-center text-2xl">
                    ✨
                  </div>
                )}
                <p className="text-white/70 text-[10px] font-medium truncate w-full text-center">
                  {nft.name}
                </p>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                    nft.rarity === "legendary"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : nft.rarity === "rare"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {nft.rarity ?? "common"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
