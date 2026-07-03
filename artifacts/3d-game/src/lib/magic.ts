// @ts-nocheck
// src/lib/magic.js
// Magic SDK instance for "Enigma of Alchemist"
// Configured for Arbitrum Sepolia so the generated wallet lives on YOUR network.
//
// SETUP REQUIRED (one time):
// 1. Create a free account at https://dashboard.magic.link
// 2. Create an app → copy the PUBLISHABLE API KEY (starts with pk_live_...)
// 3. In Magic dashboard → Social Login → enable Google
// 4. In Replit: Tools → Secrets → add key VITE_MAGIC_PUBLISHABLE_KEY with your pk_live_... value
//    (Vite only exposes env vars that start with VITE_)

import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

// Arbitrum Sepolia network config — wallet + future contract calls
// will happen on this chain.
const ARBITRUM_SEPOLIA = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
};

// Singleton — create once, import everywhere.
export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: ARBITRUM_SEPOLIA,
  extensions: [new OAuthExtension()],
});

/* ── Helper functions used by App.jsx ─────────────────────────────────── */

// Start Google login — redirects the browser to Google, then back to the app.
export async function loginWithGoogle() {
  await magic.oauth2.loginWithRedirect({
    provider: "google",
    redirectURI: window.location.origin, // must be whitelisted in Magic dashboard
  });
}

// Call on page load: if we just came back from Google, this completes login.
// Returns the user's wallet address, or null if this wasn't an OAuth redirect.
export async function handleOAuthRedirect() {
  const url = new URL(window.location.href);
  const isOAuthReturn =
    url.searchParams.has("magic_oauth_request_id") ||
    url.searchParams.has("magic_credential") ||
    url.searchParams.has("state");
  if (!isOAuthReturn) return null;

  try {
    const result = await magic.oauth2.getRedirectResult();
    // Clean the OAuth params out of the URL bar
    window.history.replaceState({}, "", window.location.pathname);
    return result?.magic?.userMetadata?.publicAddress ?? null;
  } catch (err) {
    console.error("OAuth redirect handling failed:", err);
    return null;
  }
}

// Check for an existing session (user already logged in on a previous visit).
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
