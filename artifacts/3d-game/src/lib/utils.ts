/**
 * utils.ts — shared client utility helpers
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merger (shadcn/ui convention) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate an Ethereum address for display: 0x1234…abcd */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Convert BigInt wei to a readable ETH string */
export function formatEth(wei: bigint, decimals = 4): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}

/** Format an Arbitrum Sepolia tx link */
export function arbiscanTx(txHash: string): string {
  return `https://sepolia.arbiscan.io/tx/${txHash}`;
}

/** Format an Arbitrum Sepolia address link */
export function arbiscanAddress(address: string): string {
  return `https://sepolia.arbiscan.io/address/${address}`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Generate a stable puzzle ID from a world position */
export function puzzleIdFromPosition(x: number, z: number): string {
  return `puzzle_${Math.round(x)}_${Math.round(z)}`;
}
