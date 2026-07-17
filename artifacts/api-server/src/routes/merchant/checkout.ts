/**
 * POST /api/merchant/checkout
 *
 * x402 Agentic Payments flow for buying a cosmetic skin (EnigmaRelics.purchaseSkin).
 *
 * Standard x402 handshake (see https://x402.org):
 *   1. Client calls this endpoint with no `X-PAYMENT` header.
 *   2. Server replies `402 Payment Required` with a body listing accepted
 *      payment requirements (`accepts`) — price, asset, network, payTo.
 *   3. Client signs a payment authorization matching those requirements and
 *      retries the same request with an `X-PAYMENT` header attached.
 *   4. Server verifies the payment, settles it, and returns 200 with the
 *      on-chain purchase result.
 *
 * Env vars required (server-side only — never expose to client):
 *   OPENFORT_SECRET_KEY         — from https://dashboard.openfort.io
 *   OPENFORT_WALLET_SECRET      — base64 EC P-256 key, required to sign backend-wallet ops
 *   OPENFORT_BACKEND_ACCOUNT_ID — acc_... of the backend wallet that settles the purchase
 *   OPENFORT_FEE_SPONSORSHIP_ID — pol_... fee sponsorship (omit to auto-discover)
 *   RELICS_CONTRACT_ADDRESS     — EnigmaRelics deployment on Arbitrum Sepolia
 *
 * TODO:
 *   - Replace the placeholder `X-PAYMENT` decode/verify below with a real
 *     x402 facilitator call (verify signature, expiry, nonce replay)
 *   - Confirm the player doesn't already own skinId (read ownsSkin on-chain)
 *     before settling, to avoid a wasted/reverting transaction
 */
import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import Openfort from "@openfort/openfort-node";
import type { MerchantCheckoutRequest, MerchantPaymentRequirements } from "../../types/api.js";

const router = Router();

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

const SKIN_PRICES_WEI: Record<number, bigint> = {
  1: ethers.parseEther("0.001"), // Crimson Flare
  2: ethers.parseEther("0.001"), // Amber Ember
  3: ethers.parseEther("0.002"), // Mystic Amethyst
};

const RELICS_ABI = ["function purchaseSkin(uint8 skinId) public payable"];

router.post("/", async (req: Request, res: Response) => {
  const { skinId, playerAddress } = req.body as MerchantCheckoutRequest;

  if (!skinId || !SKIN_PRICES_WEI[skinId]) {
    res.status(400).json({ error: "Valid skinId (1-3) is required" });
    return;
  }
  if (!playerAddress || !ethers.isAddress(playerAddress)) {
    res.status(400).json({ error: "Valid playerAddress is required" });
    return;
  }

  const contractAddress = process.env.RELICS_CONTRACT_ADDRESS;
  const price = SKIN_PRICES_WEI[skinId];
  const paymentHeader = req.headers["x-payment"] as string | undefined;

  // ─── Step 1: no payment attached yet — issue the x402 challenge ──────────
  if (!paymentHeader) {
    res.status(402).json({
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "arbitrum-sepolia",
          maxAmountRequired: price.toString(),
          asset: "ETH",
          payTo: contractAddress ?? "",
          resource: "/api/merchant/checkout",
          description: `Purchase skin #${skinId}`,
          extra: { skinId },
        },
      ],
    } satisfies MerchantPaymentRequirements);
    return;
  }

  // ─── Step 2: payment attached — verify & settle ──────────────────────────
  if (!contractAddress || !process.env.OPENFORT_BACKEND_ACCOUNT_ID || !process.env.OPENFORT_SECRET_KEY) {
    req.log.warn("Openfort merchant-checkout env vars not set");
    res.status(503).json({ error: "Merchant service not configured" });
    return;
  }

  try {
    /**
     * TODO: verify `paymentHeader` with the x402 facilitator instead of
     * trusting its presence — decode the base64 payment payload, check its
     * signature, amount, and expiry against `price` before settling.
     */
    req.log.info({ skinId, playerAddress }, "Settling x402 skin purchase via Openfort");

    const openfort = new Openfort(process.env.OPENFORT_SECRET_KEY!, {
      walletSecret: process.env.OPENFORT_WALLET_SECRET!,
    });
    const account = await openfort.accounts.evm.backend.get({
      id: process.env.OPENFORT_BACKEND_ACCOUNT_ID!,
    });

    const iface = new ethers.Interface(RELICS_ABI);
    const calldata = iface.encodeFunctionData("purchaseSkin", [skinId]);

    const result = await openfort.accounts.evm.backend.sendTransaction({
      account,
      chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
      interactions: [{ to: contractAddress, value: price.toString(), data: calldata }],
      policy: process.env.OPENFORT_FEE_SPONSORSHIP_ID,
    });

    res.json({
      success: true,
      txHash: result.response?.transactionHash ?? null,
      skinId,
      buyer: playerAddress,
    });
  } catch (err) {
    req.log.error({ err }, "Merchant checkout failed");
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
