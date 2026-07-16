/**
 * POST /api/nft/mint
 *
 * Gaslessly mints a reward NFT to the authenticated player's wallet via Openfort.
 *
 * Security:
 *   - Validate the session/JWT from Magic before minting
 *   - Verify the puzzle was actually solved (check on-chain or DB)
 *   - Rate-limit per wallet address
 *   - Never expose OPENFORT_SECRET_KEY to the client
 *
 * Env vars required (server-side only — never expose to client):
 *   OPENFORT_SECRET_KEY       — from https://dashboard.openfort.xyz
 *   NFT_CONTRACT_ADDRESS      — ERC-1155 on Arbitrum Sepolia
 *   OPENFORT_POLICY_ID        — gas sponsorship policy ID
 *
 * TODO:
 *   - Install @openfort/openfort-node: pnpm --filter @workspace/api-server add @openfort/openfort-node
 *   - Verify Magic DID token from Authorization header
 *   - Add idempotency: store (puzzleId, address) in DB to prevent double-mints
 */
import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import Openfort from '@openfort/openfort-node';

const router = Router();

const ERC1155_MINT_ABI = [
  "function mint(address to, uint256 id, uint256 amount, bytes data)",
];

router.post("/", async (req: Request, res: Response) => {
  const { puzzleId, tokenId = 1, amount = 1 } = req.body as {
    puzzleId?: string;
    tokenId?: number;
    amount?: number;
  };

  if (!puzzleId) {
    res.status(400).json({ error: "puzzleId is required" });
    return;
  }

  const contractAddress = process.env.NFT_CONTRACT_ADDRESS;
  // const openfortkey = process.env.OPENFORT_SECRET_KEY;
   const openfortKey = new Openfort(process.env.OPENFORT_SECRET_KEY!, {
  walletSecret: process.env.OPENFORT_WALLET_SECRET!,
});

  if (!contractAddress || !openfortKey) {
    req.log.warn("NFT_CONTRACT_ADDRESS or OPENFORT_SECRET_KEY not set");
    res.status(503).json({ error: "Minting service not configured" });
    return;
  }

  try {
    // TODO: extract player address from validated Magic DID token
    const playerAddress = req.headers["x-player-address"] as string;
    if (!playerAddress || !ethers.isAddress(playerAddress)) {
      res.status(401).json({ error: "Valid player address required" });
      return;
    }

    // TODO: verify puzzleId is solved by this player before minting

    // Build mint calldata
    const iface = new ethers.Interface(ERC1155_MINT_ABI);
    const calldata = iface.encodeFunctionData("mint", [
      playerAddress,
      tokenId,
      amount,
      "0x",
    ]);

    req.log.info({ puzzleId, playerAddress, tokenId }, "Minting NFT via Openfort");

    /**
     * TODO: Replace placeholder with real Openfort SDK call:
     *
     * import Openfort from "@openfort/openfort-node";
     * const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY!);
     * const txIntent = await openfort.transactionIntents.create({
     *   player: playerAddress,
     *   policy: process.env.OPENFORT_POLICY_ID!,
     *   chainId: 421614,
     *   interactions: [{
     *     contract: contractAddress,
     *     functionName: "mint",
     *     functionArgs: [playerAddress, tokenId, amount, "0x"],
     *   }],
     * });
     * const txHash = txIntent.response?.transactionHash;
     */

    // Placeholder response
    const placeholderTxHash = `0x${"0".repeat(62)}01`;

    res.json({
      success: true,
      txHash: placeholderTxHash,
      tokenId,
      recipient: playerAddress,
      puzzleId,
      _calldata: calldata, // remove in production
    });
  } catch (err) {
    req.log.error({ err }, "NFT mint failed");
    res.status(500).json({ error: "Mint failed" });
  }
});

export default router;
