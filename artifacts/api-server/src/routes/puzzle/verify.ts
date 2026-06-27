/**
 * POST /api/puzzle/verify
 *
 * Verifies a player's puzzle answer server-side.
 * Answers must never travel to the client in plaintext — only this endpoint
 * knows the correct answer.
 *
 * Returns { correct: boolean } — on correct, the client then calls /api/nft/mint.
 *
 * TODO:
 *   - Load puzzles from DB instead of the in-memory map below
 *   - Add rate-limiting (max 10 attempts per puzzleId per wallet per hour)
 *   - Log attempts for anti-cheat analysis
 *   - Support on-chain verification via PuzzleVerifier contract (ZK proof optional)
 */
import { Router, Request, Response } from "express";
import type { PuzzleVerifyRequest, PuzzleVerifyResponse } from "../../types/api.js";

const router = Router();

// ─── Puzzle answer registry (move to DB) ─────────────────────────────────────

const PUZZLE_ANSWERS: Record<string, { answer: string; rewardTokenId: number }> = {
  puzzle_0_0: { answer: "fire", rewardTokenId: 1 },
  puzzle_10_5: { answer: "shadow", rewardTokenId: 2 },
  puzzle_minus5_12: { answer: "mercury", rewardTokenId: 3 },
  // Add more puzzles here
};

// ─── Route ────────────────────────────────────────────────────────────────────

router.post("/", (req: Request, res: Response) => {
  const { puzzleId, answer, playerAddress } = req.body as PuzzleVerifyRequest;

  if (!puzzleId || !answer) {
    res.status(400).json({ correct: false, message: "puzzleId and answer are required" } satisfies PuzzleVerifyResponse);
    return;
  }

  const puzzle = PUZZLE_ANSWERS[puzzleId];
  if (!puzzle) {
    res.status(404).json({ correct: false, message: "Puzzle not found" } satisfies PuzzleVerifyResponse);
    return;
  }

  const correct = answer.trim().toLowerCase() === puzzle.answer.toLowerCase();

  req.log.info({ puzzleId, playerAddress, correct }, "Puzzle attempt");

  res.json({
    correct,
    message: correct ? "Correct! Mint your reward NFT." : "Incorrect answer.",
    ...(correct ? { rewardTokenId: puzzle.rewardTokenId } : {}),
  } satisfies PuzzleVerifyResponse);
});

export default router;
