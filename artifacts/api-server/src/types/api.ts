/**
 * api.ts — shared TypeScript types for API server routes
 */

export interface PuzzleVerifyRequest {
  puzzleId: string;
  answer: string;
  playerAddress?: string;
}

export interface PuzzleVerifyResponse {
  correct: boolean;
  message?: string;
  rewardTokenId?: number;
}

export interface MintRequest {
  puzzleId: string;
  tokenId?: number;
  amount?: number;
}

export interface MintResponse {
  success: boolean;
  txHash: string;
  tokenId: number;
  recipient: string;
  puzzleId: string;
}
