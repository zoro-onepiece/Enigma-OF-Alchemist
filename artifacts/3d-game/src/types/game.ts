/**
 * game.ts — shared TypeScript types for Enigma of Alchemist
 */

// ─── NFT ──────────────────────────────────────────────────────────────────────

export type NFTRarity = "common" | "rare" | "legendary";

export interface NFTMetadata {
  tokenId: number;
  name: string;
  description?: string;
  image?: string;           // IPFS / Arweave URI
  animationUrl?: string;    // .glb or video for 3D NFTs
  rarity: NFTRarity;
  attributes: Array<{ trait_type: string; value: string | number }>;
  puzzleId?: string;        // which puzzle unlocked this NFT
}

// ─── Puzzle ───────────────────────────────────────────────────────────────────

export type PuzzleType = "riddle" | "cipher" | "pattern" | "alchemy";

export interface Puzzle {
  id: string;
  type: PuzzleType;
  title: string;
  description: string;
  rewardTokenId: number;    // ERC-1155 token to mint on solve
  position: [number, number, number]; // world-space spawn point
  solved?: boolean;
}

// ─── Monster ──────────────────────────────────────────────────────────────────

export type MonsterType = "golem" | "wraith" | "chimera" | "boss";

export interface MonsterDefinition {
  type: MonsterType;
  name: string;
  modelUrl?: string;
  hp: number;
  damage: number;
  speed: number;
  xpReward: number;
  scale?: number;
}

// ─── Player ───────────────────────────────────────────────────────────────────

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  xp: number;
  level: number;
  attack: number;
  defense: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface MintRequest {
  puzzleId: string;
  tokenId?: number;
  amount?: number;
}

export interface MintResponse {
  txHash: string;
  tokenId: number;
  recipient: string;
}

export interface PuzzleVerifyRequest {
  puzzleId: string;
  answer: string;
  playerAddress?: string;
}

export interface PuzzleVerifyResponse {
  correct: boolean;
  message?: string;
}
