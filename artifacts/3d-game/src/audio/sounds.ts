/**
 * sounds.ts
 *
 * Lazy-loading audio module for background music, ambience, sprint
 * breathing, and one-shot SFX. Files are expected under public/audio/
 * (music.mp3, void.mp3, breath.mp3, chime.mp3, victory.mp3, footstep.mp3,
 * click.mp3, hum.mp3 [optional, for the puzzle pedestal hum]).
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
      .then((res) => {
        if (!res.ok) return false;
        // Dev servers (Vite's SPA fallback in particular) can return a 200
        // with index.html for ANY unmatched path, including a nonexistent
        // /audio/*.mp3 — so `res.ok` alone is a false positive. Require an
        // audio content-type too, otherwise treat it as missing.
        const contentType = res.headers.get("content-type") ?? "";
        return contentType.startsWith("audio/");
      })
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

// Currently-playing one-shot clones. Unlike musicEl/voidEl/breathEl (each a
// single long-lived element the useSoundStore.subscribe callback below can
// reach into), every playSfx() call clones a fresh, short-lived node — the
// check-before-play guards above only stop FUTURE plays, so a chime/victory
// sound already mid-playback the instant mute is toggled on used to keep
// playing to completion with nothing syncing it live. Tracked here so that
// gap closes the same way the loops do; entries remove themselves on
// "ended" so this set never accumulates stale finished clones.
const activeSfxNodes = new Set<HTMLAudioElement>();

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
    activeSfxNodes.add(node);
    node.addEventListener("ended", () => activeSfxNodes.delete(node));
    node.play().catch(() => {});
  });
}

// ─── Shared browser-autoplay gate ──────────────────────────────────────────
// Browsers block audio.play() until the page has seen a user gesture
// (pointerdown/keydown). Music, void ambience, and breath all need this, so
// it's tracked once, globally, rather than each having its own listener —
// which also means audio requested AFTER the very first gesture of the page
// session (e.g. music restarting after a logout → re-login) can start
// immediately instead of waiting for a second, redundant gesture.
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

// ─── Fade helper (shared by music + breath) ────────────────────────────────
// Returns the interval id (or null if it paused synchronously) so a caller
// that wants to resume playback before the fade finishes can cancel it —
// without that, a resumed loop would look "already playing" (el.paused is
// still false mid-fade) and get silently killed once the stale fade reaches
// zero and calls .pause() on its own.
function fadeOutAndPause(el: HTMLAudioElement, fadeMs: number, restoreVolume: number): number | null {
  const startVolume = el.volume;
  if (fadeMs <= 0 || startVolume <= 0) {
    el.pause();
    el.currentTime = 0;
    el.volume = restoreVolume;
    return null;
  }
  const steps = 8;
  const stepMs = fadeMs / steps;
  let i = 0;
  const interval = window.setInterval(() => {
    i += 1;
    el.volume = Math.max(0, startVolume * (1 - i / steps));
    if (i >= steps) {
      window.clearInterval(interval);
      el.pause();
      el.currentTime = 0;
      el.volume = restoreVolume;
    }
  }, stepMs);
  return interval;
}

// ─── Background music (gameplay) ───────────────────────────────────────────
let musicEl: HTMLAudioElement | null = null;
let musicMissing = false;
let musicWanted = false;
// In-flight load guard — see loadBreathElement's identical `breathLoading`
// pattern below. Without this, React 18 StrictMode's dev-mode double-invoke
// of App.jsx's mount effect (see main.tsx) calls startMusic() twice back to
// back; both calls see `musicEl` still null and each `await checkExists`
// the same path, so both go on to build their OWN `new Audio(path)` and
// call .play() on it — two overlapping instances of the same track, with
// only the second one's reference ever reachable via `musicEl` afterward
// (the first keeps looping, orphaned, forever). Caching the in-flight
// promise makes the second call await and reuse the first call's result
// instead of racing it.
let musicLoading: Promise<void> | null = null;
const MUSIC_VOLUME = 0.25;

async function startMusic() {
  musicWanted = true;
  if (musicMissing) return;
  if (!musicEl) {
    if (!musicLoading) {
      musicLoading = (async () => {
        const path = `${AUDIO_BASE}music.mp3`;
        const ok = await checkExists(path);
        if (!ok) {
          musicMissing = true;
          return;
        }
        // Re-check after the async existence check — the player may have
        // logged out (stopMusic) while music.mp3's first-ever HEAD request was
        // still in flight, in which case playing now would leave music running
        // under the login screen with nothing left to stop it.
        if (!musicWanted) return;
        musicEl = new Audio(path);
        musicEl.loop = true;
        musicEl.volume = MUSIC_VOLUME;
        musicEl.muted = useSoundStore.getState().muted;
      })();
    }
    await musicLoading;
  }
  if (!musicWanted) return;
  musicEl?.play().catch(() => {});
}

/** Call once (e.g. from Scene.tsx on mount). Starts music immediately if the
 * page has already seen a user gesture this session (e.g. re-entering
 * gameplay after a logout), otherwise waits for the first pointerdown/
 * keydown (browsers block un-prompted autoplay). */
export function initMusicOnFirstInteraction(): void {
  runAfterInteraction(startMusic);
}

/** Stops gameplay music with a short fade — call when the player logs out
 * back to the auth screen. No-op if music was never started/missing. */
export function stopMusic(fadeMs = 700): void {
  musicWanted = false;
  if (!musicEl) return;
  fadeOutAndPause(musicEl, fadeMs, MUSIC_VOLUME);
}

// ─── Ambient loop (pre-gameplay screens: login + intro story) ──────────────
let voidEl: HTMLAudioElement | null = null;
let voidMissing = false;
let voidWanted = false;
// Same in-flight load guard as musicLoading above — App.jsx's mount effect
// calls setVoidAmbienceActive(true) (which calls this) twice under
// StrictMode; without dedup that produced two independent void.mp3
// `Audio` elements both playing at once (the actual reported "void.mp3
// overlapping itself" bug).
let voidLoading: Promise<HTMLAudioElement | null> | null = null;
const VOID_VOLUME = 0.2;

async function loadVoidElement(): Promise<HTMLAudioElement | null> {
  if (voidMissing) return null;
  if (voidEl) return voidEl;
  if (voidLoading) return voidLoading;
  voidLoading = (async () => {
    const path = `${AUDIO_BASE}void.mp3`;
    const ok = await checkExists(path);
    if (!ok) {
      voidMissing = true;
      return null;
    }
    const el = new Audio(path);
    el.loop = true;
    el.volume = VOID_VOLUME;
    el.muted = useSoundStore.getState().muted;
    voidEl = el;
    return el;
  })();
  return voidLoading;
}

/** Call with `true` while a pre-gameplay screen (login/IntroStory) is
 * showing, and `false` the instant gameplay begins — the two loops
 * (void/music) are mutually exclusive and never play together. Handles the
 * autoplay gesture gate itself, so callers don't need to know about it. */
export function setVoidAmbienceActive(active: boolean): void {
  voidWanted = active;
  if (active) {
    runAfterInteraction(() => {
      if (!voidWanted) return; // gameplay may have started before the gesture arrived
      loadVoidElement().then((el) => {
        // Re-check after the async load — gameplay may have started while
        // the file was still loading (checkExists is a real HEAD request),
        // in which case voidWanted flipped false after this callback was
        // queued but before it resolved. Without this, void.mp3 would start
        // playing right as/after Scene mounts and never get paused again.
        if (!el || !voidWanted) return;
        el.play().catch(() => {});
      });
    });
    if (voidEl) voidEl.play().catch(() => {});
  } else if (voidEl) {
    voidEl.pause();
  }
}

// ─── Sprint breathing loop ──────────────────────────────────────────────────
let breathEl: HTMLAudioElement | null = null;
let breathMissing = false;
let breathLoading: Promise<HTMLAudioElement | null> | null = null;
let breathFadeInterval: number | null = null;
const BREATH_VOLUME = 0.5;

function cancelBreathFade(): void {
  if (breathFadeInterval !== null) {
    window.clearInterval(breathFadeInterval);
    breathFadeInterval = null;
  }
}

function loadBreathElement(): Promise<HTMLAudioElement | null> {
  if (breathMissing) return Promise.resolve(null);
  if (breathEl) return Promise.resolve(breathEl);
  if (breathLoading) return breathLoading;
  breathLoading = (async () => {
    const path = `${AUDIO_BASE}breath.mp3`;
    const ok = await checkExists(path);
    if (!ok) {
      breathMissing = true;
      return null;
    }
    const el = new Audio(path);
    el.loop = true;
    el.volume = BREATH_VOLUME;
    el.muted = useSoundStore.getState().muted;
    breathEl = el;
    return el;
  })();
  return breathLoading;
}

/** Starts the sprint-breathing loop. Idempotent while already playing (a
 * single reused element/instance) so rapid sprint toggling never stacks
 * overlapping playback — call every frame/tick sprint is active. */
export function startBreathSound(): void {
  // Cancel any in-flight fade-out from a stopBreathSound() that fired just
  // before sprint resumed (e.g. switching movement keys drops `moving` for
  // a beat) — otherwise el.paused is still false here (mid-fade), this call
  // no-ops thinking playback is already fine, and the stale fade reaches
  // zero a moment later and pauses it anyway, cutting the loop short.
  cancelBreathFade();
  loadBreathElement().then((el) => {
    if (!el) return;
    el.volume = BREATH_VOLUME;
    if (el.paused) el.play().catch(() => {});
  });
}

/** Stops the sprint-breathing loop with a quick fade — call the instant
 * sprint ends (Shift released or movement stops). No-op if not playing. */
export function stopBreathSound(): void {
  if (!breathEl || breathEl.paused) return;
  cancelBreathFade();
  breathFadeInterval = fadeOutAndPause(breathEl, 200, BREATH_VOLUME);
}

// Keep every looping element's mute state — AND any one-shot SFX clone
// still mid-playback — in sync with the shared sound store, live. One mute
// concept for the whole app.
useSoundStore.subscribe((s) => {
  if (musicEl) musicEl.muted = s.muted;
  if (voidEl) voidEl.muted = s.muted;
  if (breathEl) breathEl.muted = s.muted;
  activeSfxNodes.forEach((node) => {
    node.muted = s.muted;
  });
});
