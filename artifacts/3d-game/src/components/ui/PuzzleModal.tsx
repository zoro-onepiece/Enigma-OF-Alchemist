/**
 * PuzzleModal
 *
 * DOM overlay that appears when the player activates a puzzle object.
 * On successful solve, triggers gasless NFT mint via Openfort.
 *
 * TODO:
 *   - Implement puzzle logic (cipher, pattern, riddle variants)
 *   - Call mintNFT() from useOpenfort on correct answer
 *   - Show animated success state with NFT preview
 *   - Persist solved state to gameStore + on-chain
 */
import { useState } from "react";
import { useOpenfort } from "@/components/web3/OpenfortProvider";

interface PuzzleModalProps {
  puzzleId: string;
  title?: string;
  riddle?: string;
  answer?: string;
  onClose: () => void;
  onSolved: (puzzleId: string) => void;
}

export default function PuzzleModal({
  puzzleId,
  title = "The Alchemist's Riddle",
  riddle = "I have no life, but I can die. I have no mouth, but water can kill me. What am I?",
  answer = "fire",
  onClose,
  onSolved,
}: PuzzleModalProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "minting" | "success">("idle");
  const { mintNFT, isReady } = useOpenfort();

  const handleSubmit = async () => {
    if (input.trim().toLowerCase() !== answer.toLowerCase()) {
      setStatus("wrong");
      setTimeout(() => setStatus("idle"), 1500);
      return;
    }

    setStatus("minting");
    try {
      await mintNFT({ puzzleId });
      setStatus("success");
      onSolved(puzzleId);
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f0f1a] border border-purple-800/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-purple-900/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-purple-300 font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-green-400 font-semibold mb-2">Puzzle Solved!</p>
            <p className="text-white/50 text-sm">NFT minted gaslessly to your wallet.</p>
          </div>
        ) : (
          <>
            {/* Riddle */}
            <div className="bg-purple-950/40 border border-purple-800/30 rounded-xl p-4 mb-6">
              <p className="text-white/80 text-sm italic leading-relaxed">"{riddle}"</p>
            </div>

            {/* Answer input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Enter your answer…"
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors mb-4 ${
                status === "wrong"
                  ? "border-red-500 placeholder-red-400/50"
                  : "border-white/10 focus:border-purple-500 placeholder-white/30"
              }`}
            />

            {status === "wrong" && (
              <p className="text-red-400 text-xs mb-3 -mt-2">Incorrect — try again.</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isReady || status === "minting"}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:text-white/30 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {status === "minting" ? "Minting NFT…" : "Submit Answer"}
            </button>

            {!isReady && (
              <p className="text-white/30 text-xs text-center mt-3">
                Connect wallet to mint your reward NFT.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
