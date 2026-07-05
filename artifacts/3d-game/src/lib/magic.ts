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
    console.log("[DEBUG] handleOAuthRedirect: search params =", window.location.search);
    console.log("[DEBUG] handleOAuthRedirect: param keys =", Array.from(params.keys()));
    // Broad detection: any of the params Magic/Google attach on return
    const looksLikeOAuthReturn =
      params.has("magic_oauth_request_id") ||
      params.has("magic_credential") ||
      params.has("provider") ||
      (params.has("state") && params.has("code")) ||
      params.has("code");

    console.log("[DEBUG] handleOAuthRedirect: looksLikeOAuthReturn =", looksLikeOAuthReturn);

    if (!looksLikeOAuthReturn) return null;

    try {
      const result = await magic.oauth2.getRedirectResult();
      console.log("[DEBUG] handleOAuthRedirect: getRedirectResult() raw result =", result);
      window.history.replaceState({}, "", window.location.pathname);

      // Address can land under either `magic` or `oauth`, depending on
      // provider/SDK version — check both before falling back to the
      // rescue loop.
      let addr =
        result?.magic?.userMetadata?.publicAddress ??
        result?.oauth?.userMetadata?.publicAddress ??
        null;
      console.log("[magic] OAuth redirect processed, address:", addr);

      // The browser may not have synced the Magic session yet even
      // though getRedirectResult() succeeded. Poll isLoggedIn/getInfo a
      // few times before giving up, instead of a single check.
      if (!addr) {
        console.warn("[magic] address missing from result, running rescue loop...");
        for (let i = 0; i < 5 && !addr; i++) {
          await new Promise((r) => setTimeout(r, 300));
          try {
            if (await magic.user.isLoggedIn()) {
              const info = await magic.user.getInfo();
              addr = info?.publicAddress ?? null;
              if (addr) {
                console.log(`[magic] rescue succeeded after ${i + 1} attempt(s):`, addr);
              }
            }
          } catch (rescueErr) {
            console.error("[DEBUG] rescue loop attempt failed:", rescueErr);
          }
        }
      }

      return addr;
    } catch (err) {
      console.error("[magic] getRedirectResult failed:", err);
      console.error("[DEBUG] getRedirectResult error name/message/stack:", err?.name, err?.message, err?.stack);
      // Rescue path: the session may still exist even if result
      // processing threw — poll before giving up.
      for (let i = 0; i < 5; i++) {
        try {
          if (await magic.user.isLoggedIn()) {
            const info = await magic.user.getInfo();
            console.log("[magic] rescued existing session:", info?.publicAddress);
            if (info?.publicAddress) return info.publicAddress;
          }
        } catch (rescueErr) {
          console.error("[DEBUG] rescue path isLoggedIn/getInfo failed:", rescueErr);
        }
        await new Promise((r) => setTimeout(r, 300));
      }
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
