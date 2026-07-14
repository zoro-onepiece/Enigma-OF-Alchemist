/**
 * voice.ts
 *
 * Browser-native Web Speech API (window.speechSynthesis) dialogue system —
 * no external API, no backend, no key. Provides a serial speech queue (so
 * overlapping triggers never cut each other off), female-voice preference,
 * and a subscribable "currently speaking" value SubtitleBar.tsx renders.
 *
 * Design goals mirror sounds.ts:
 *   - Never throw / never spam the console — if speechSynthesis doesn't
 *     exist, every export here silently no-ops.
 *   - Respects the same global `useSoundStore` mute flag as the rest of the
 *     game's audio, so there is exactly one mute concept in the app.
 *   - Waits for a user gesture the same way sounds.ts's runAfterInteraction
 *     does — some browsers block speechSynthesis.speak() before one too.
 */
import { useSoundStore } from "../store/soundStore";

const supported =
  typeof window !== "undefined" && "speechSynthesis" in window;

// ─── Voice selection ────────────────────────────────────────────────────────
// getVoices() can return an empty array on first call — the real list loads
// asynchronously and fires 'voiceschanged' once ready (Chrome in particular).
let selectedVoice: SpeechSynthesisVoice | null = null;
let selectedVoiceLabel = "speech synthesis unsupported";

function pickVoice(voices: SpeechSynthesisVoice[]): void {
  if (!voices.length) return;
  const female = voices.find((v) => /female/i.test(v.name));
  if (female) {
    selectedVoice = female;
    selectedVoiceLabel = `female voice selected: ${female.name}`;
    return;
  }
  const fallback = voices.find((v) => v.default) ?? voices[0];
  selectedVoice = fallback ?? null;
  selectedVoiceLabel = fallback
    ? `no female voice found, using default (${fallback.name})`
    : "no female voice found, using default";
}

if (supported) {
  pickVoice(window.speechSynthesis.getVoices());
  window.speechSynthesis.onvoiceschanged = () => {
    pickVoice(window.speechSynthesis.getVoices());
  };
}

/** For diagnostics/reporting only — which voice speak() is using. */
export function getSelectedVoiceLabel(): string {
  return selectedVoiceLabel;
}

// ─── Gesture gate — mirrors sounds.ts's runAfterInteraction ────────────────
let hasInteracted = false;
let interactionGateArmed = false;
let pendingAfterInteraction: Array<() => void> = [];

function armInteractionGate(): void {
  if (interactionGateArmed) return;
  interactionGateArmed = true;
  const handler = () => {
    hasInteracted = true;
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
    const queued = pendingAfterInteraction;
    pendingAfterInteraction = [];
    queued.forEach((cb) => cb());
  };
  window.addEventListener("pointerdown", handler);
  window.addEventListener("keydown", handler);
}

function runAfterInteraction(cb: () => void): void {
  if (hasInteracted) {
    cb();
    return;
  }
  pendingAfterInteraction.push(cb);
  armInteractionGate();
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

// ─── Serial speech queue ────────────────────────────────────────────────────
let queue: string[] = [];
let speaking = false;

function playNext(): void {
  if (speaking) return;
  if (!supported || useSoundStore.getState().muted) {
    queue = [];
    setCurrentText(null);
    return;
  }
  const next = queue.shift();
  if (next === undefined) {
    setCurrentText(null);
    return;
  }
  speaking = true;
  setCurrentText(next);
  const utterance = new SpeechSynthesisUtterance(next);
  if (selectedVoice) utterance.voice = selectedVoice;
  const advance = () => {
    speaking = false;
    playNext();
  };
  utterance.onend = advance;
  utterance.onerror = advance;
  window.speechSynthesis.speak(utterance);
}

/** Speak a line of dialogue. Normal lines queue after whatever's already
 * playing; `priority: true` moves the line to the front of the queue
 * (without interrupting speech already in progress) so guidance dialogue
 * isn't stuck behind a long backlog. No-ops entirely if speechSynthesis is
 * unsupported, muted, or the page hasn't seen a user gesture yet (queued
 * until it does, same as sounds.ts's music/ambience). */
export function speak(text: string, opts?: { priority?: boolean }): void {
  if (!supported || !text) return;
  runAfterInteraction(() => {
    if (useSoundStore.getState().muted) return;
    if (opts?.priority) {
      queue.unshift(text);
    } else {
      queue.push(text);
    }
    playNext();
  });
}

/** Stops whatever's currently playing and clears the queue immediately —
 * call when mute is toggled on, or when the caller wants to talk over
 * itself intentionally (e.g. IntroStory's tap-to-advance). */
export function cancelSpeech(): void {
  if (!supported) return;
  queue = [];
  speaking = false;
  window.speechSynthesis.cancel();
  setCurrentText(null);
}

if (supported) {
  useSoundStore.subscribe((s) => {
    if (s.muted) cancelSpeech();
  });
}

// ─── Per-trigger cooldown gate ──────────────────────────────────────────────
// Shared by every in-game dialogue trigger point (puzzle-approach hints,
// ordinal solve encouragement, the 4/4 finale line) so "don't repeat within
// ~20s" is enforced in exactly one place instead of once per call site.
const lastTriggeredAt = new Map<string, number>();

/** Returns true (and arms the cooldown) at most once per `cooldownMs` for a
 * given trigger key. Callers should only call speak() when this returns
 * true. */
export function canTrigger(key: string, cooldownMs = 20000): boolean {
  const now = Date.now();
  const last = lastTriggeredAt.get(key);
  if (last !== undefined && now - last < cooldownMs) return false;
  lastTriggeredAt.set(key, now);
  return true;
}
