/**
 * GET  /api/auth/session  — return current session info
 * POST /api/auth/session  — validate a Magic DID token and create a session
 * DELETE /api/auth/session — logout / destroy session
 *
 * Magic Labs DID token validation:
 *   1. Client logs in with Magic SDK (social login)
 *   2. Client gets a DID token: magic.user.getIdToken()
 *   3. Client sends token in Authorization: Bearer <DID_TOKEN>
 *   4. Server validates with Magic Admin SDK and extracts wallet address
 *
 * Env vars required:
 *   MAGIC_SECRET_KEY — from https://dashboard.magic.link (Admin SDK)
 *   SESSION_SECRET   — used to sign the express-session cookie
 *
 * TODO:
 *   - Install @magic-sdk/admin: pnpm --filter @workspace/api-server add @magic-sdk/admin
 *   - Validate DID token: new MagicAdmin(MAGIC_SECRET_KEY).token.validate(didToken)
 *   - Store session in DB (user row keyed by wallet address)
 *   - Add CSRF protection
 */
import { Router, Request, Response } from "express";

const router = Router();

// ─── GET /api/auth/session ───────────────────────────────────────────────────

router.get("/", (req: Request, res: Response) => {
  const session = (req as Request & { session?: { playerAddress?: string; email?: string } }).session;
  if (session?.playerAddress) {
    res.json({
      authenticated: true,
      playerAddress: session.playerAddress,
      email: session.email ?? null,
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ─── POST /api/auth/session ──────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization ?? "";
  const didToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!didToken) {
    res.status(401).json({ error: "DID token required in Authorization: Bearer <token>" });
    return;
  }

  const magicSecretKey = process.env.MAGIC_SECRET_KEY;
  if (!magicSecretKey) {
    req.log.warn("MAGIC_SECRET_KEY not set — cannot validate DID token");
    res.status(503).json({ error: "Auth service not configured" });
    return;
  }

  try {
    /**
     * TODO: replace placeholder with real Magic Admin SDK validation:
     *
     * import { Magic as MagicAdmin } from "@magic-sdk/admin";
     * const magic = new MagicAdmin(process.env.MAGIC_SECRET_KEY!);
     * magic.token.validate(didToken);
     * const metadata = await magic.users.getMetadataByToken(didToken);
     * const playerAddress = metadata.publicAddress;
     * const email = metadata.email;
     */
    const playerAddress = req.body.playerAddress as string | undefined;
    const email = req.body.email as string | undefined;

    if (!playerAddress) {
      res.status(400).json({ error: "playerAddress required (temp: until DID validation is wired)" });
      return;
    }

    // Store in session
    const s = req as Request & { session: Record<string, string> };
    s.session.playerAddress = playerAddress;
    if (email) s.session.email = email;

    req.log.info({ playerAddress }, "Player session created");
    res.json({ authenticated: true, playerAddress, email: email ?? null });
  } catch (err) {
    req.log.error({ err }, "Session creation failed");
    res.status(401).json({ error: "Invalid DID token" });
  }
});

// ─── DELETE /api/auth/session ────────────────────────────────────────────────

router.delete("/", (req: Request, res: Response) => {
  const s = req as Request & { session?: { destroy?: (cb: (err: unknown) => void) => void } };
  if (s.session?.destroy) {
    s.session.destroy((err) => {
      if (err) req.log.error({ err }, "Session destroy failed");
    });
  }
  res.json({ authenticated: false });
});

export default router;
