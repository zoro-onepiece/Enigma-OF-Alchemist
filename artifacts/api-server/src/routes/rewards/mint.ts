/**
 * POST /api/rewards/mint
 *
 * Sponsors (gasless) a call to EnigmaRelics.mintPuzzleReward via an Openfort
 * backend wallet, rewarding the player with an ERC-721 relic after they
 * solve a puzzle.
 *
 * Env vars required (server-side only — never expose to client):
 *   OPENFORT_SECRET_KEY         — from https://dashboard.openfort.io
 *   OPENFORT_WALLET_SECRET      — base64 EC P-256 key, required to sign backend-wallet ops
 *   OPENFORT_BACKEND_ACCOUNT_ID — acc_... of the backend wallet that owns EnigmaRelics
 *   OPENFORT_FEE_SPONSORSHIP_ID — pol_... fee sponsorship (omit to auto-discover)
 *   RELICS_CONTRACT_ADDRESS     — EnigmaRelics deployment on Arbitrum Sepolia
 *
 * TODO:
 *   - Verify the Magic DID token from the Authorization header instead of
 *     trusting `playerAddress` from the request body (needs @magic-sdk/admin)
 *   - Verify puzzleId was actually solved by this player before minting —
 *     the puzzle mini-games run entirely client-side (PuzzleModal.tsx), so
 *     there is currently no server-side record to check against; the older
 *     /api/puzzle/verify route tracks a different, disconnected puzzle-id
 *     scheme and isn't wired to the live client puzzles
 *   - Idempotency: store (puzzleId, playerAddress) so a retry can't double-mint
 */
import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import Openfort from "@openfort/openfort-node";
import type { RewardsMintRequest, RewardsMintResponse } from "../../types/api.js";

const router = Router();

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

const RELICS_ABI = [
  "function mintPuzzleReward(address player, string memory tokenURI) external returns (uint256)",
];

router.post("/", async (req: Request, res: Response) => {
  const { puzzleId, playerAddress, tokenURI } = req.body as RewardsMintRequest;

  if (!puzzleId || !playerAddress || !tokenURI) {
    res.status(400).json({ error: "puzzleId, playerAddress and tokenURI are required" });
    return;
  }
  if (!ethers.isAddress(playerAddress)) {
    res.status(400).json({ error: "playerAddress is not a valid address" });
    return;
  }

  const contractAddress = process.env.RELICS_CONTRACT_ADDRESS;
  const backendAccountId = process.env.OPENFORT_BACKEND_ACCOUNT_ID;

  if (!contractAddress || !backendAccountId || !process.env.OPENFORT_SECRET_KEY) {
    req.log.warn("Openfort reward-mint env vars not set");
    res.status(503).json({ error: "Minting service not configured" });
    return;
  }

  try {
    const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY!, {
      walletSecret: process.env.OPENFORT_WALLET_SECRET!,
    });

    const account = await openfort.accounts.evm.backend.get({ id: backendAccountId });

    const iface = new ethers.Interface(RELICS_ABI);
    const calldata = iface.encodeFunctionData("mintPuzzleReward", [playerAddress, tokenURI]);

    req.log.info({ puzzleId, playerAddress, tokenURI }, "Sponsoring mintPuzzleReward via Openfort");

    const result = await openfort.accounts.evm.backend.sendTransaction({
      account,
      chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
      interactions: [{ to: contractAddress, value: "0", data: calldata }],
      policy: process.env.OPENFORT_FEE_SPONSORSHIP_ID,
    });

    res.json({
      success: true,
      txHash: result.response?.transactionHash ?? null,
      recipient: playerAddress,
      puzzleId,
    } satisfies RewardsMintResponse);
  } catch (err) {
    req.log.error({ err }, "Reward mint failed");
    res.status(500).json({ error: "Mint failed" });
  }
});

export default router;
