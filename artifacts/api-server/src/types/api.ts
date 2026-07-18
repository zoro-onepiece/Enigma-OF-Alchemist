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

export interface RewardsMintRequest {
  puzzleId: string;
  playerAddress: string;
  tokenURI: string;
}

export interface RewardsMintResponse {
  success: boolean;
  txHash: string | null;
  recipient: string;
  puzzleId: string;
}

export interface MerchantCheckoutRequest {
  skinId: 1 | 2 | 3;
  playerAddress: string;
}

export interface MerchantPaymentRequirements {
  x402Version: 1;
  accepts: Array<{
    scheme: "exact";
    network: "arbitrum-sepolia";
    maxAmountRequired: string;
    asset: "ETH";
    payTo: string;
    resource: string;
    description: string;
    extra: { skinId: number };
  }>;
}
