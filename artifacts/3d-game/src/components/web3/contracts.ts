/**
 * contracts.ts
 *
 * On-chain contract addresses and ABIs for Enigma of Alchemist.
 * All contracts are deployed on Arbitrum Sepolia (chainId: 421614).
 *
 * Env vars:
 *   VITE_NFT_CONTRACT_ADDRESS   — ERC-1155 NFT contract
 *   VITE_PUZZLE_CONTRACT_ADDRESS — Puzzle verifier contract (optional on-chain verify)
 *
 * Usage (read-only, public RPC):
 *   import { getNFTContract } from "@/components/web3/contracts";
 *   const contract = getNFTContract(provider);
 *   const balance = await contract.balanceOf(address, tokenId);
 */
import { ethers } from "ethers";

// ─── Chain config ────────────────────────────────────────────────────────────

export const ARBITRUM_SEPOLIA = {
  chainId: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorer: "https://sepolia.arbiscan.io",
} as const;

// ─── Contract addresses ───────────────────────────────────────────────────────

export const NFT_CONTRACT_ADDRESS =
  import.meta.env.VITE_NFT_CONTRACT_ADDRESS ?? "";

export const PUZZLE_CONTRACT_ADDRESS =
  import.meta.env.VITE_PUZZLE_CONTRACT_ADDRESS ?? "";

// ─── ABIs (minimal) ───────────────────────────────────────────────────────────

export const ERC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function uri(uint256 id) view returns (string)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
] as const;

export const PUZZLE_VERIFIER_ABI = [
  "function isPuzzleSolved(address player, bytes32 puzzleId) view returns (bool)",
  "function submitSolution(bytes32 puzzleId, bytes calldata proof) external",
  "event PuzzleSolved(address indexed player, bytes32 indexed puzzleId, uint256 rewardTokenId)",
] as const;

// ─── Contract factories ───────────────────────────────────────────────────────

export function getPublicProvider() {
  return new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA.rpcUrl);
}

export function getNFTContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(NFT_CONTRACT_ADDRESS, ERC1155_ABI, provider);
}

export function getPuzzleContract(provider: ethers.Provider | ethers.Signer) {
  return new ethers.Contract(PUZZLE_CONTRACT_ADDRESS, PUZZLE_VERIFIER_ABI, provider);
}
