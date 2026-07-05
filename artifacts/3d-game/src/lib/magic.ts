// @ts-nocheck
// src/lib/magic.js
// Magic SDK instance for "Enigma of Alchemist" — Arbitrum Sepolia
// v3: Switched from Google OAuth2 to Email OTP (Magic Link email login).
// Google OAuth was abandoned because Replit's iframe preview environment
// enforces third-party cookie restrictions that broke the OAuth session
// handoff (getRedirectResult kept resolving with a null address). Email
// OTP uses Magic's own hosted flow (an iframe/modal) and does not depend
// on third-party cookies or a redirect round-trip, so it works reliably
// inside the Replit preview.

import { Magic } from "magic-sdk";

const ARBITRUM_SEPOLIA = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
};

export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: ARBITRUM_SEPOLIA,
});

/**
 * Sends a Magic Link to the given email and resolves once the user has
 * clicked it and completed login (Magic handles the whole flow via its
 * own hosted UI — no redirect back to our app is required).
 */
export async function loginWithEmail(email) {
  await magic.auth.loginWithMagicLink({ email });
}

/**
 * Returns the wallet address for the current Magic session, or null if
 * there isn't one.
 */
export async function getExistingSession() {
  try {
    const loggedIn = await magic.user.isLoggedIn();
    if (!loggedIn) return null;
    const info = await magic.user.getInfo();
    return info?.publicAddress ?? null;
  } catch (err) {
    console.error("[magic] getExistingSession failed:", err);
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
