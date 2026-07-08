// @ts-nocheck
// src/lib/magic.ts

import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: {
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
  },
  extensions: [new OAuthExtension()],
});

// ✅ Email OTP / Magic Link
export async function loginWithEmail(email) {
  console.log("[magic] Sending Magic Link to:", email);
  await magic.auth.loginWithMagicLink({
    email,
    redirectURI: window.location.origin,
    showUI: false,
  });
}

export async function loginWithGoogle() {
  await magic.oauth2.loginWithRedirect({
    provider: "google",
    redirectURI: window.location.origin,
  });
}

export async function getExistingSession() {
  try {
    const isLoggedIn = await magic.user.isLoggedIn();
    console.log("[magic] isLoggedIn():", isLoggedIn);
    if (isLoggedIn) {
      const info = await magic.user.getInfo();
      console.log("[magic] getInfo() result:", JSON.stringify(info, null, 2));
      return info.publicAddress;
    }
  } catch (e) {
    console.error("[magic] Session check error:", e);
  }
  return null;
}

export async function handleOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (
    !params.has("magic_credential") &&
    !params.has("code") &&
    !params.has("state")
  ) {
    return null;
  }

  console.log("[magic] Processing OAuth redirect...");
  try {
    const result = await magic.oauth2.getRedirectResult();

    // 🔍 DEBUG: yeh line poora result object dikhayegi
    console.log("[magic] RAW OAuth result:", JSON.stringify(result, null, 2));

    window.history.replaceState({}, "", window.location.pathname);

    if (result?.magic?.userMetadata?.publicAddress) {
      console.log(
        "[magic] Got address from getRedirectResult:",
        result.magic.userMetadata.publicAddress,
      );
      return result.magic.userMetadata.publicAddress;
    } else {
      console.warn(
        "[magic] getRedirectResult succeeded but publicAddress missing. Full result above ⬆️",
      );
    }
  } catch (e) {
    console.error("[magic] getRedirectResult FAILED:", e);
    window.history.replaceState({}, "", window.location.pathname);
  }

  // Rescue Loop
  console.log("[magic] Checking backend for session...");
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const address = await getExistingSession();
    if (address) {
      console.log(`[magic] Rescue successful on attempt ${i + 1}!`, address);
      return address;
    }
  }

  console.error("[magic] Rescue loop failed — no session found after 6 tries.");
  return null;
}

export async function logout() {
  await magic.user.logout();
}
