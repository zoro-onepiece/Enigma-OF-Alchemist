// @ts-nocheck
import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: {
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
  },
  extensions: [new OAuthExtension()],
});

// ✅ FIX: Use loginWithMagicLink for Custom UI Redirect flows
export async function loginWithEmail(email) {
  console.log("[magic] Sending Magic Link to:", email);
  // This triggers an email, and redirects the user back to your app when clicked!
  await magic.auth.loginWithMagicLink({
    email,
    redirectURI: window.location.origin, // MUST match your vercel domain
    showUI: false, // <-- Agar showUI true hai aur domain allowlist me nahi, toh 401 aata hai
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
    if (isLoggedIn) {
      const info = await magic.user.getInfo();
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
    window.history.replaceState({}, "", window.location.pathname);

    if (result?.magic?.userMetadata?.publicAddress) {
      return result.magic.userMetadata.publicAddress;
    }
  } catch (e) {
    console.warn(
      "[magic] OAuth Result Error, starting rescue loop...",
      e.message,
    );
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
  return null;
}

export async function logout() {
  await magic.user.logout();
}
