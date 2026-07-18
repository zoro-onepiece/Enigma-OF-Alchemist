/**
 * voice.ts
 *
 * Character dialogue system. Two playback modes share one serial queue so
 * they never talk over each other regardless of which kind either side is:
 *   - Pre-recorded lines (playVoiceLine) — 22 MP3s under public/audio/,
 *     covering every named character-dialogue trigger in the game.
 *   - Live speech synthesis (speak) — the story-narrator voice: IntroStory's
 *     4 opening paragraphs (player-paced prose with no pre-recorded audio)
 *     plus any other line that reads as the world/narrator speaking rather
 *     than the player character (e.g. GlowingPuzzle's shrine-approach hint).
 *
 * Design goals mirror sounds.ts:
 *   - Never throw / never spam the console — a missing/undecodable file (or
 *     unsupported speechSynthesis) just silently advances to the next
 *     queued line instead of getting stuck.
 *   - Respects the same global `useSoundStore` mute flag as the rest of the
 *     game's audio, so there is exactly one mute concept in the app.
 *   - Waits for a user gesture the same way sounds.ts's runAfterInteraction
 *     does — browsers block both speechSynthesis and Audio.play() before one.
 */
import { useSoundStore } from "../store/soundStore";
import { audioFileExists, duckMusicVolume, restoreMusicVolume } from "./sounds";

// ─── Voice tuning (speechSynthesis fallback only — see file header) ────────
const VOICE_PITCH = 1.25;
const VOICE_RATE = 1.1;

const PREFERRED_VOICE_KEYWORDS = [
  "aria",
  "jenny",
  "michelle",
  "ana",
  "emma",
  "samantha",
  "zira",
];

const ttsSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

// ─── Voice selection (speechSynthesis fallback only) ───────────────────────
let selectedVoice: SpeechSynthesisVoice | null = null;
let selectedVoiceLabel = "speech synthesis unsupported";

function logVoiceList(voices: SpeechSynthesisVoice[]): void {
  console.info(
    `[voice.ts] ${voices.length} voice(s) available:`,
    voices.map((v) => `${v.name} (${v.lang}${v.default ? ", default" : ""})`),
  );
}

function pickVoice(voices: SpeechSynthesisVoice[]): void {
  if (!voices.length) return;
  logVoiceList(voices);

  for (const keyword of PREFERRED_VOICE_KEYWORDS) {
    const match = voices.find((v) => v.name.toLowerCase().includes(keyword));
    if (match) {
      selectedVoice = match;
      selectedVoiceLabel = `preferred voice selected: ${match.name} (matched "${keyword}")`;
      console.info(`[voice.ts] ${selectedVoiceLabel}`);
      return;
    }
  }

  const female = voices.find((v) => /female/i.test(v.name));
  if (female) {
    selectedVoice = female;
    selectedVoiceLabel = `no preferred-keyword match, using female voice: ${female.name}`;
    console.info(`[voice.ts] ${selectedVoiceLabel}`);
    return;
  }

  const fallback = voices.find((v) => v.default) ?? voices[0];
  selectedVoice = fallback ?? null;
  selectedVoiceLabel = fallback
    ? `no female/preferred voice found, using default (${fallback.name})`
    : "no female/preferred voice found, using default";
  console.info(`[voice.ts] ${selectedVoiceLabel}`);
}

if (ttsSupported) {
  pickVoice(window.speechSynthesis.getVoices());
  window.speechSynthesis.onvoiceschanged = () => {
    pickVoice(window.speechSynthesis.getVoices());
  };
}

/** For diagnostics/reporting only — which voice speak() falls back to. */
export function getSelectedVoiceLabel(): string {
  return selectedVoiceLabel;
}

/** Re-logs the full available-voice list on demand. */
export function logAvailableVoices(): void {
  if (!ttsSupported) return;
  logVoiceList(window.speechSynthesis.getVoices());
}

// ─── Gesture gate — mirrors sounds.ts's runAfterInteraction ────────────────
let hasInteracted = false;
let interactionGateArmed = false;
let pendingAfterInteraction: Array<() => void> = [];

function flushInteractionGate(): void {
  if (hasInteracted) return;
  hasInteracted = true;
  window.removeEventListener("pointerdown", gestureListener);
  window.removeEventListener("keydown", gestureListener);
  const queued = pendingAfterInteraction;
  pendingAfterInteraction = [];
  queued.forEach((cb) => cb());
}

function gestureListener(): void {
  flushInteractionGate();
}

function armInteractionGate(): void {
  if (interactionGateArmed) return;
  interactionGateArmed = true;
  window.addEventListener("pointerdown", gestureListener);
  window.addEventListener("keydown", gestureListener);
}

function runAfterInteraction(cb: () => void): void {
  if (hasInteracted) {
    cb();
    return;
  }
  pendingAfterInteraction.push(cb);
  armInteractionGate();
}

/** Root-cause fix for "the first queued line of a session never plays":
 * armInteractionGate()'s pointerdown/keydown listener only starts existing
 * the first time speak()/playVoiceLine() is ever called — which happens
 * from IntroStory's mount effect / App.jsx's greeting effect, i.e. AFTER
 * login's click has already fully dispatched. That click is never observed
 * (nothing was listening for it yet), so the first line(s) get deferred to
 * pendingAfterInteraction. The next gesture that finally arrives is usually
 * the user clicking "Continue" on IntroStory's silent-but-visible first
 * paragraph — but that SAME click also drives IntroStory's advance(),
 * whose effect cleanup calls cancelSpeech() in the same tick, wiping the
 * very line(s) that click had just unblocked before anything audible ever
 * played. Every later call works fine because hasInteracted is already
 * true by then, so no deferral/race exists.
 *
 * Call this directly and synchronously inside a real, trusted click/keydown
 * handler (e.g. a login button's onClick, before any async work) instead —
 * confirming the gesture at its actual source closes the gate immediately,
 * so by the time greeting_welcome/paragraph 0 ever try to play, there's
 * nothing to defer and no cancelSpeech() race left to lose. */
export function markUserInteracted(): void {
  // eslint-disable-next-line no-console
  console.log("🔊 markUserInteracted CALLED at", Date.now());
  flushInteractionGate();
}

/** Diagnostic-only: exposes the gate's live state so call sites can log it
 * (e.g. App.jsx's greeting effect) without reaching into module internals. */
export function hasUserInteracted(): boolean {
  return hasInteracted;
}

// ─── Currently-speaking subscribable value (read by SubtitleBar) ──────────
let currentText: string | null = null;
const listeners = new Set<() => void>();

function setCurrentText(text: string | null): void {
  if (currentText === text) return;
  currentText = text;
  listeners.forEach((l) => l());
}

export function getCurrentSpeechText(): string | null {
  return currentText;
}

/** useSyncExternalStore-compatible subscribe: listener takes no args. */
export function subscribeSpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ─── The 22 pre-recorded character lines under public/audio/ ──────────────
export type VoiceLineName =
  | "greeting_welcome"
  | "merchant_first_meet"
  | "skin_equipped"
  | "skin_equipped_alt"
  | "damage_reaction_1"
  | "damage_reaction_2"
  | "gameover_line"
  | "tryagain_line"
  | "minigame_lowmoves"
  | "minigame_lowflips"
  | "minigame_fail"
  | "sprint_first_time"
  | "idle_reminder"
  | "minimap_first_open"
  | "chest_claim"
  | "epilogue_thankyou"
  | "puzzle_hint_generic"
  | "puzzle_solved_1st"
  | "puzzle_solved_2nd"
  | "puzzle_solved_3rd"
  | "puzzle_solved_4th"
  | "prefinale_line";

const VOICE_LINE_BASE = "/audio/";

// ─── Serial queue — shared by both playback modes ──────────────────────────
interface QueueItem {
  text: string;
  /** Path to a pre-recorded line, or null for live speechSynthesis. */
  audioPath: string | null;
}

let queue: QueueItem[] = [];
let speaking = false;
// Tracks the in-flight <audio> element (if the current item is a
// pre-recorded line) so cancelSpeech() can stop it immediately instead of
// letting it play to completion.
let currentAudioEl: HTMLAudioElement | null = null;

function playNext(): void {
  if (speaking) return;
  if (useSoundStore.getState().muted) {
    queue = [];
    setCurrentText(null);
    restoreMusicVolume();
    return;
  }
  const next = queue.shift();
  if (!next) {
    setCurrentText(null);
    restoreMusicVolume();
    return;
  }
  speaking = true;
  setCurrentText(next.text);
  duckMusicVolume();

  const advance = () => {
    speaking = false;
    currentAudioEl = null;
    playNext();
  };

  if (next.audioPath) {
    const path = next.audioPath;
    audioFileExists(path).then((ok) => {
      // Re-check mute/queue-clear state after the async existence check —
      // mute could have fired while this was in flight.
      if (!ok || useSoundStore.getState().muted) {
        advance();
        return;
      }
      const el = new Audio(path);
      el.volume = 1;
      el.muted = useSoundStore.getState().muted;
      currentAudioEl = el;
      el.onended = advance;
      el.onerror = advance;
      const playPromise = el.play();
      if (path.includes("greeting_welcome")) {
        playPromise
          .then(() => {
            // eslint-disable-next-line no-console
            console.log("🔊 greeting play() result:", "resolved");
          })
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.log("🔊 greeting play() result:", err);
          });
      }
      playPromise.catch(advance);
    });
    return;
  }

  if (!ttsSupported) {
    advance();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(next.text);
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.pitch = VOICE_PITCH;
  utterance.rate = VOICE_RATE;
  utterance.onend = advance;
  utterance.onerror = advance;
  window.speechSynthesis.speak(utterance);
}

/** Speak a line via live speechSynthesis — the story-narrator voice (see
 * file header): IntroStory's opening paragraphs and any other narrator-
 * voiced line (e.g. GlowingPuzzle's shrine hint). Character-voiced reactive
 * dialogue still uses playVoiceLine() instead. Normal lines queue after
 * whatever's already playing; `priority: true` moves the line to the front
 * (without interrupting speech already in progress). No-ops if
 * speechSynthesis is unsupported, muted, or before the first user gesture
 * (queued until it arrives). */
export function speak(text: string, opts?: { priority?: boolean }): void {
  if (!text) return;
  runAfterInteraction(() => {
    if (useSoundStore.getState().muted) return;
    const item: QueueItem = { text, audioPath: null };
    if (opts?.priority) queue.unshift(item);
    else queue.push(item);
    playNext();
  });
}

/** Play one of the 22 pre-recorded character lines. `subtitleText` is shown
 * in SubtitleBar while it plays — a fixed, hand-written string (not derived
 * from the audio via STT), same as every other line in this file. Goes
 * through the exact same serial queue/priority/mute gating as speak(), so
 * a recorded line and a speechSynthesis line (or two recorded lines) never
 * overlap. No-ops if muted or before the first user gesture (queued until
 * it arrives); a missing/corrupt file just silently advances past it. */
export function playVoiceLine(
  name: VoiceLineName,
  subtitleText: string,
  opts?: { priority?: boolean },
): void {
  if (!subtitleText) return;
  runAfterInteraction(() => {
    if (useSoundStore.getState().muted) return;
    const item: QueueItem = {
      text: subtitleText,
      audioPath: `${VOICE_LINE_BASE}${name}.mp3`,
    };
    if (opts?.priority) queue.unshift(item);
    else queue.push(item);
    playNext();
  });
}

/** Stops whatever's currently playing (recorded line or speechSynthesis)
 * and clears the queue immediately — call when mute is toggled on, or when
 * the caller wants to talk over itself intentionally (e.g. IntroStory's
 * tap-to-advance). */
export function cancelSpeech(): void {
  queue = [];
  speaking = false;
  restoreMusicVolume();
  if (currentAudioEl) {
    currentAudioEl.pause();
    currentAudioEl = null;
  }
  if (ttsSupported) window.speechSynthesis.cancel();
  setCurrentText(null);
}

useSoundStore.subscribe((s) => {
  if (s.muted) cancelSpeech();
});

// ─── Per-trigger cooldown gate ──────────────────────────────────────────────
// Shared by every in-game dialogue trigger point (puzzle-approach hints,
// ordinal solve encouragement, the 4/4 finale line, etc.) so "don't repeat
// within N seconds" is enforced in exactly one place instead of once per
// call site.
const lastTriggeredAt = new Map<string, number>();

/** Returns true (and arms the cooldown) at most once per `cooldownMs` for a
 * given trigger key. Callers should only call speak()/playVoiceLine() when
 * this returns true. */
export function canTrigger(key: string, cooldownMs = 20000): boolean {
  const now = Date.now();
  const last = lastTriggeredAt.get(key);
  if (last !== undefined && now - last < cooldownMs) return false;
  lastTriggeredAt.set(key, now);
  return true;
}
