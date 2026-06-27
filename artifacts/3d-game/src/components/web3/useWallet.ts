/**
 * useWallet
 *
 * Convenience hook that composes useMagic() + useOpenfort() into a single
 * interface consumed throughout the game.
 *
 * Returns:
 *   address       — checksummed wallet address (null when disconnected)
 *   isConnected   — true when Magic session is active
 *   isLoading     — true while Magic is resolving the session
 *   login         — open Magic connect UI
 *   logout        — destroy Magic session
 *   mintNFT       — gasless mint via Openfort
 *   isMinting     — true while a mint tx is in flight
 *   lastTxHash    — most recent mint tx hash
 */
import { useMagic } from "./MagicProvider";
import { useOpenfort } from "./OpenfortProvider";

export function useWallet() {
  const { isLoggedIn, isLoading, walletAddress, login, logout } = useMagic();
  const { mintNFT, isMinting, lastTxHash, isReady } = useOpenfort();

  return {
    address: walletAddress,
    isConnected: isLoggedIn,
    isLoading,
    login,
    logout,
    mintNFT,
    isMinting,
    lastTxHash,
    isOpenfortReady: isReady,
  };
}
