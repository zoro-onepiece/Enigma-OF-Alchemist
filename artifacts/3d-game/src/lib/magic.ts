// @ts-nocheck
// src/lib/magic.js
// Magic SDK instance for "Enigma of Alchemist" — Arbitrum Sepolia
// v2: OAuth redirect handling is now double-call proof (React StrictMode
// runs effects twice in dev, and getRedirectResult may only run once).

import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

const ARBITRUM_SEPOLIA = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
};

export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: ARBITRUM_SEPOLIA,
  extensions: [new OAuthExtension()],
});

export async function loginWithGoogle() {
  await magic.oauth2.loginWithRedirect({
    provider: "google",
    redirectURI: window.location.origin,
  });
}

/* ── Singleton redirect handler ────────────────────────────────────────
   getRedirectResult() may only be called ONCE per redirect. React
   StrictMode mounts effects twice in dev, so we cache the promise at
   module level — the second call reuses the same in-flight promise
   instead of firing a second (failing) request. */
let redirectPromise = null;

export function handleOAuthRedirect() {
  if (redirectPromise) return redirectPromise;

  redirectPromise = (async () => {
    const params = new URLSearchParams(window.location.search);
    // Broad detection: any of the params Magic/Google attach on return
    const looksLikeOAuthReturn =
      params.has("magic_oauth_request_id") ||
      params.has("magic_credential") ||
      params.has("provider") ||
      (params.has("state") && params.has("code")) ||
      params.has("code");

    if (!looksLikeOAuthReturn) return null;

    try {
      const result = await magic.oauth2.getRedirectResult();
      window.history.replaceState({}, "", window.location.pathname);
      const addr = result?.magic?.userMetadata?.publicAddress ?? null;
      console.log("[magic] OAuth redirect processed, address:", addr);
      return addr;
    } catch (err) {
      console.error("[magic] getRedirectResult failed:", err);
      // Rescue path: the session may still exist even if result
      // processing hiccuped — check before giving up.
      try {
        if (await magic.user.isLoggedIn()) {
          const info = await magic.user.getInfo();
          console.log("[magic] rescued existing session:", info?.publicAddress);
          return info?.publicAddress ?? null;
        }
      } catch {}
      return null;
    }
  })();

  return redirectPromise;
}

export async function getExistingSession() {
  try {
    const loggedIn = await magic.user.isLoggedIn();
    if (!loggedIn) return null;
    const info = await magic.user.getInfo();
    return info?.publicAddress ?? null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await magic.user.logout();
  } catch (err) {
    console.error("Logout failed:", err);
  }
}
