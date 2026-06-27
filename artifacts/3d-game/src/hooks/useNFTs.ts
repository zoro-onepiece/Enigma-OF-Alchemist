/**
 * useNFTs
 *
 * Fetches the player's NFT inventory from Arbitrum Sepolia.
 * Uses ethers.js with a public RPC — no wallet required for reads.
 *
 * TODO:
 *   - Replace placeholder data with real contract calls via getNFTContract()
 *   - Fetch token metadata from tokenURI (IPFS / Arweave)
 *   - Cache results with React Query or SWR
 */
import { useState, useEffect } from "react";
import { useWallet } from "@/components/web3/useWallet";
import { getNFTContract, getPublicProvider } from "@/components/web3/contracts";

export interface NFTItem {
  tokenId: number;
  name: string;
  image?: string;
  rarity?: "common" | "rare" | "legendary";
  puzzleId?: string;
}

interface UseNFTsResult {
  nfts: NFTItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Token IDs defined in the ERC-1155 contract
const KNOWN_TOKEN_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

export function useNFTs(): UseNFTsResult {
  const { address } = useWallet();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!address) {
      setNfts([]);
      return;
    }

    let cancelled = false;

    async function fetchNFTs() {
      setIsLoading(true);
      setError(null);
      try {
        const provider = getPublicProvider();
        const contract = getNFTContract(provider);

        const balances: bigint[] = await contract.balanceOfBatch(
          KNOWN_TOKEN_IDS.map(() => address),
          KNOWN_TOKEN_IDS,
        );

        const owned: NFTItem[] = [];
        for (let i = 0; i < KNOWN_TOKEN_IDS.length; i++) {
          if (balances[i] > 0n) {
            // TODO: fetch real metadata from tokenURI
            owned.push({
              tokenId: KNOWN_TOKEN_IDS[i],
              name: `Alchemist Rune #${KNOWN_TOKEN_IDS[i]}`,
              rarity: KNOWN_TOKEN_IDS[i] >= 7 ? "legendary" : KNOWN_TOKEN_IDS[i] >= 4 ? "rare" : "common",
            });
          }
        }

        if (!cancelled) setNfts(owned);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load NFTs");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchNFTs();
    return () => { cancelled = true; };
  }, [address, tick]);

  return { nfts, isLoading, error, refetch };
}
