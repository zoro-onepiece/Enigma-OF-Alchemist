/**
 * OpenfortProvider
 *
 * Wraps the app with an Openfort client for gasless transactions on
 * Arbitrum Sepolia. Provides useOpenfort() hook.
 *
 * Env vars required:
 *   VITE_OPENFORT_PUBLISHABLE_KEY — from https://dashboard.openfort.xyz
 *   VITE_NFT_CONTRACT_ADDRESS     — deployed ERC-1155 on Arbitrum Sepolia
 *
 * Flow:
 *   1. User logs in with Magic (MagicProvider)
 *   2. Pass Magic's ethers provider to Openfort
 *   3. Call mintNFT() → Openfort relays the tx gaslessly via its bundler
 */
import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { Openfort } from "@openfort/openfort-js";

interface MintParams {
  puzzleId: string;
  tokenId?: number;
  amount?: number;
}

interface OpenfortContextValue {
  client: Openfort | null;
  isReady: boolean;
  mintNFT: (params: MintParams) => Promise<{ txHash: string }>;
  isMinting: boolean;
  lastTxHash: string | null;
}

const OpenfortContext = createContext<OpenfortContextValue>({
  client: null,
  isReady: false,
  mintNFT: async () => ({ txHash: "" }),
  isMinting: false,
  lastTxHash: null,
});

export function useOpenfort() {
  return useContext(OpenfortContext);
}

interface OpenfortProviderProps {
  children: ReactNode;
}

export function OpenfortProvider({ children }: OpenfortProviderProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const key = import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY;
  const client = key ? new Openfort(key) : null;
  const isReady = !!client;

  /**
   * mintNFT
   *
   * Calls the /api/nft/mint backend route, which:
   *   1. Builds the mint transaction with ethers
   *   2. Submits it via Openfort's gasless bundler
   *   3. Returns the on-chain txHash
   */
  const mintNFT = async ({ puzzleId, tokenId = 1, amount = 1 }: MintParams) => {
    if (!isReady) throw new Error("Openfort not initialised");
    setIsMinting(true);
    try {
      const res = await fetch("/api/nft/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId, tokenId, amount }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Mint failed");
      }
      const { txHash } = await res.json();
      setLastTxHash(txHash);
      return { txHash };
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <OpenfortContext.Provider
      value={{ client, isReady, mintNFT, isMinting, lastTxHash }}
    >
      {children}
    </OpenfortContext.Provider>
  );
}
