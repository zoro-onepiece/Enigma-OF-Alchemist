/**
 * sounds.ts
 *
 * Lazy-loading audio module for background music + one-shot SFX. Files are
 * expected under public/audio/ (music.mp3, footstep.mp3, chime.mp3,
 * victory.mp3, click.mp3, hum.mp3 [optional, for the puzzle pedestal hum]).
 *
 * Design goals:
 *   - Never throw / never spam the console — if a file is missing, every
 *     function here silently no-ops so the game keeps working before the
 *     user has uploaded any audio.
 *   - A single HEAD-request existence check per path (cached in
 *     `existsCache`) so a missing file only ever produces one network
 *     request, not one per playback attempt, and never shows a decode/404
 *     error from a bare `new Audio().play()` call.
 *   - Respects the same global `useSoundStore` mute flag the puzzle SFX
 *     hooks already use, so there is exactly one mute concept in the app.
 */
import { useSoundStore } from "../store/soundStore";

const AUDIO_BASE = "/audio/";

export type SfxName = "click" | "chime" | "victory" | "footstep";

const existsCache = new Map<string, Promise<boolean>>();

function checkExists(path: string): Promise<boolean> {
  let cached = existsCache.get(path);
  if (!cached) {
    cached = fetch(path, { method: "HEAD" })
      .then((res) => res.ok)
      .catch(() => false);
    existsCache.set(path, cached);
  }
  return cached;
}

/** Exposed so R3F components (e.g. the puzzle hum) can gate their own
 * audio nodes on file presence without ever hitting a 404 themselves. */
export function audioFileExists(path: string): Promise<boolean> {
  return checkExists(path);
}

const sfxElementCache = new Map<SfxName, HTMLAudioElement | null>();

async function getSfxElement(name: SfxName): Promise<HTMLAudioElement | null> {
  if (sfxElementCache.has(name)) return sfxElementCache.get(name) ?? null;
  const path = `${AUDIO_BASE}${name}.mp3`;
  const ok = await checkExists(path);
  if (!ok) {
    sfxElementCache.set(name, null);
    return null;
  }
  const el = new Audio(path);
  el.preload = "auto";
  sfxElementCache.set(name, el);
  return el;
}

/** Fire-and-forget one-shot SFX. Clones the cached element so overlapping
 * calls (e.g. rapid clicks) don't cut each other off. No-ops if muted or
 * the file is missing. */
export function playSfx(name: SfxName, volume = 0.55): void {
  if (useSoundStore.getState().muted) return;
  getSfxElement(name).then((base) => {
    if (!base) return;
    if (useSoundStore.getState().muted) return; // re-check after the async load
    const node = base.cloneNode(true) as HTMLAudioElement;
    node.volume = volume;
    node.play().catch(() => {});
  });
}

// ─── Background music ──────────────────────────────────────────────────────
let musicEl: HTMLAudioElement | null = null;
let musicMissing = false;
let musicArmed = false;

async function startMusic() {
  if (musicMissing) return;
  if (!musicEl) {
    const path = `${AUDIO_BASE}music.mp3`;
    const ok = await checkExists(path);
    if (!ok) {
      musicMissing = true;
      return;
    }
    musicEl = new Audio(path);
    musicEl.loop = true;
    musicEl.volume = 0.25;
    musicEl.muted = useSoundStore.getState().muted;
  }
  musicEl.play().catch(() => {});
}

/** Call once (e.g. from Scene.tsx on mount). Arms a one-time listener for
 * the first pointerdown/keydown so music starts only after a user gesture
 * (browsers block un-prompted autoplay), per the task's requirement. */
export function initMusicOnFirstInteraction(): void {
  if (musicArmed) return;
  musicArmed = true;
  const handler = () => {
    startMusic();
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("pointerdown", handler);
  window.addEventListener("keydown", handler);
}

// Keep music's mute state in sync with the shared sound store, live.
useSoundStore.subscribe((s) => {
  if (musicEl) musicEl.muted = s.muted;
});
