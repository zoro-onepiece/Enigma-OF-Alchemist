/**
 * POST /api/merchant/checkout
 *
 * x402 Agentic Payments flow for buying a cosmetic skin. Calls
 * EnigmaRelics.purchaseSkin(uint8 skinId) on Arbitrum Sepolia via an
 * Openfort backend wallet, which fronts the ETH price and sponsors gas —
 * the player never needs testnet ETH or a signing prompt.
 *
 * Standard x402 handshake (see https://x402.org):
 *   1. Client calls this endpoint with no `X-PAYMENT` header.
 *   2. Server replies `402 Payment Required` with a body listing accepted
 *      payment requirements (`accepts`) — price, asset, network, payTo.
 *   3. Client signs a payment authorization matching those requirements and
 *      retries the same request with an `X-PAYMENT` header attached.
 *   4. Server verifies the payment, settles it on-chain, and returns 200.
 *
 * Env vars required (server-side only — never expose to client):
 *   OPENFORT_SECRET_KEY         — from https://dashboard.openfort.io
 *   OPENFORT_WALLET_SECRET      — base64 EC P-256 key, required to sign backend-wallet ops
 *   OPENFORT_BACKEND_ACCOUNT_ID — acc_... of the backend wallet that settles the purchase
 *   OPENFORT_FEE_SPONSORSHIP_ID — pol_... fee sponsorship (omit to auto-discover)
 *   RELICS_CONTRACT_ADDRESS     — EnigmaRelics deployment on Arbitrum Sepolia
 *
 * Known gap: x402's standardized "exact" scheme is built around ERC-3009
 * (`transferWithAuthorization`) for ERC-20 stablecoins — there is no
 * equivalent standard for a raw native-ETH payable call like
 * `purchaseSkin`. Without a facilitator service to verify a signed payment
 * authorization against, the `X-PAYMENT` header below is checked for
 * presence/shape only, not cryptographically verified. Wiring a real
 * facilitator (or switching the contract to accept an ERC-20 with
 * EIP-3009 support) is required before this is safe to run with real funds.
 */
import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import Openfort from "@openfort/openfort-node";
import type { MerchantCheckoutRequest, MerchantPaymentRequirements } from "../../types/api.js";

const router = Router();

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

// Must match EnigmaRelics.sol's skinPrices exactly.
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

  if (!contractAddress) {
    req.log.warn("RELICS_CONTRACT_ADDRESS not set");
    res.status(503).json({ error: "Merchant service not configured" });
    return;
  }

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
          payTo: contractAddress,
          resource: "/api/merchant/checkout",
          description: `Purchase skin #${skinId}`,
          extra: { skinId },
        },
      ],
    } satisfies MerchantPaymentRequirements);
    return;
  }

  // ─── Step 2: payment attached — verify & settle ──────────────────────────
  if (!process.env.OPENFORT_BACKEND_ACCOUNT_ID || !process.env.OPENFORT_SECRET_KEY) {
    req.log.warn("Openfort merchant-checkout env vars not set");
    res.status(503).json({ error: "Merchant service not configured" });
    return;
  }

  // See the "Known gap" note above the imports: not a cryptographic
  // verification, just a presence/shape check until a real x402
  // facilitator is wired in.
  if (typeof paymentHeader !== "string" || paymentHeader.length < 10) {
    res.status(400).json({ error: "Invalid X-PAYMENT header" });
    return;
  }

  try {
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
