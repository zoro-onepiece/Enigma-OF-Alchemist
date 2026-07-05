// // @ts-nocheck
// // src/lib/magic.js
// // Magic SDK instance for "Enigma of Alchemist" — Arbitrum Sepolia
// //
// // Dual-authentication: Email OTP (Magic Link) is the primary login path
// // (Google OAuth previously broke inside Replit's iframe preview because
// // third-party cookie restrictions caused getRedirectResult() to resolve
// // with a null address). Google OAuth is offered as a one-click
// // alternative on the Main Menu; its redirect handling below is hardened
// // (timeouts + a rescue fallback) precisely because of that history, so it
// // degrades gracefully instead of hanging if the redirect handoff hiccups.
// //
// // Dual auth: Email OTP (magic.auth.loginWithMagicLink, core SDK, no
// // extension needed) and Google OAuth (magic.oauth2, via @magic-ext/oauth2).
// // OAuth redirect handling is double-call proof (React StrictMode runs
// // effects twice in dev, and getRedirectResult() may only run once per
// // redirect).

// import { Magic } from "magic-sdk";
// import { OAuthExtension } from "@magic-ext/oauth2";

// const ARBITRUM_SEPOLIA = {
//   rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
//   chainId: 421614,
// };

// // The OAuth extension must be registered here, or `magic.oauth2` stays
// // undefined and any call to loginWithGoogle()/getRedirectResult() throws
// // "Cannot read properties of undefined" instead of the intended
// // timeout/graceful-fallback behavior below.
// export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
//   network: ARBITRUM_SEPOLIA,
//   extensions: [new OAuthExtension()],
// });

// // Magic's SDK calls (isLoggedIn/getInfo/getRedirectResult/loginWithMagicLink)
// // talk to a hidden iframe + Magic's backend. If the publishable key is
// // invalid/misconfigured or Magic's servers are unreachable, those calls can
// // hang indefinitely instead of rejecting — which would otherwise leave the
// // app stuck on a loading spinner forever (indistinguishable from a "bounce
// // back" once the user gives up waiting). Every SDK call below is wrapped
// // with a timeout so auth resolution always finishes one way or another.
// export const AUTH_CALL_TIMEOUT_MS = 8000;

// export function withTimeout(promise, ms, label) {
//   return new Promise((resolve, reject) => {
//     const timer = setTimeout(() => {
//       reject(new Error(`[magic] ${label} timed out after ${ms}ms`));
//     }, ms);
//     promise.then(
//       (value) => {
//         clearTimeout(timer);
//         resolve(value);
//       },
//       (err) => {
//         clearTimeout(timer);
//         reject(err);
//       },
//     );
//   });
// }

// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // ── Email OTP (Magic Link) ────────────────────────────────────────────────
// // magic.auth.loginWithMagicLink resolves with a DID token once the user
// // clicks the emailed link (or enters the OTP), and rejects/never resolves
// // if the email is invalid or the user abandons the flow — so it also gets
// // the timeout treatment.
// /**
//  * Sends a Magic Link to the given email and resolves once the user has
//  * clicked it and completed login (Magic handles the whole flow via its
//  * own hosted UI — no redirect back to our app is required), returning the
//  * resulting wallet address (or null if no session materialized).
//  */
// export async function loginWithEmail(email) {
//   await magic.auth.loginWithEmailOTP({ email });
// }

// // ── Google OAuth ────────────────────────────────────────────────────────
// export async function loginWithGoogle() {
//   await withTimeout(
//     magic.oauth2.loginWithRedirect({
//       provider: "google",
//       redirectURI: window.location.origin,
//     }),
//     AUTH_CALL_TIMEOUT_MS,
//     "loginWithRedirect()",
//   );
// }

// /* ── Singleton redirect handler ────────────────────────────────────────
//    getRedirectResult() may only be called ONCE per redirect. React
//    StrictMode mounts effects twice in dev, so we cache the promise at
//    module level — the second call reuses the same in-flight promise
//    instead of firing a second (failing) request. */
// let redirectPromise = null;

// export function handleOAuthRedirect() {
//   if (redirectPromise) return redirectPromise;

//   redirectPromise = (async () => {
//     const params = new URLSearchParams(window.location.search);
//     // Broad detection: any of the params Magic/Google attach on return
//     const looksLikeOAuthReturn =
//       params.has("magic_oauth_request_id") ||
//       params.has("magic_credential") ||
//       params.has("provider") ||
//       (params.has("state") && params.has("code")) ||
//       params.has("code");

//     if (!looksLikeOAuthReturn) return null;

//     // Once we've decided this navigation is an OAuth return, strip the
//     // query params up front regardless of how processing turns out below —
//     // otherwise a failed getRedirectResult() that's rescued by the
//     // isLoggedIn()/getInfo() fallback would leave magic_oauth_request_id /
//     // code / state params dangling in the URL after a successful login.
//     const cleanUrl = () =>
//       window.history.replaceState({}, "", window.location.pathname);

//     try {
//       const result = await withTimeout(
//         magic.oauth2.getRedirectResult(),
//         AUTH_CALL_TIMEOUT_MS,
//         "getRedirectResult()",
//       );
//       cleanUrl();
//       const addr = result?.magic?.userMetadata?.publicAddress ?? null;
//       console.log("[magic] OAuth redirect processed, address:", addr);
//       return addr;
//     } catch (err) {
//       console.error("[magic] getRedirectResult failed:", err);
//       // Rescue path: getRedirectResult() commonly throws when the PKCE
//       // verifier/state metadata for this request got dropped (e.g. a
//       // second/duplicate callback processing attempt, storage partitioning,
//       // or the tab losing its sessionStorage across the redirect) even
//       // though Magic's backend already completed the login server-side. A
//       // short delay gives Magic's iframe a moment to finish syncing session
//       // state before we check isLoggedIn()/getInfo() as a fallback — without
//       // it, an immediate check can race the iframe and falsely report
//       // "not logged in" even for a login that actually succeeded.
//       await sleep(3000);
//       try {
//         const loggedIn = await withTimeout(
//           magic.user.isLoggedIn(),
//           AUTH_CALL_TIMEOUT_MS,
//           "isLoggedIn() (rescue)",
//         );
//         if (loggedIn) {
//           const info = await withTimeout(
//             magic.user.getInfo(),
//             AUTH_CALL_TIMEOUT_MS,
//             "getInfo() (rescue)",
//           );
//           cleanUrl();
//           console.log("[magic] rescued existing session:", info?.publicAddress);
//           return info?.publicAddress ?? null;
//         }
//       } catch (rescueErr) {
//         console.error("[magic] rescue path failed:", rescueErr);
//       }
//       // Neither path produced a session — still clean the URL so a stale
//       // OAuth callback doesn't get reprocessed (and misdetected as a new
//       // return) on the next refresh.
//       cleanUrl();
//       return null;
//     }
//   })();

//   return redirectPromise;
// }

// /**
//  * Returns the wallet address for the current Magic session, or null if
//  * there isn't one.
//  */
// export async function getExistingSession() {
//   try {
//     const loggedIn = await withTimeout(
//       magic.user.isLoggedIn(),
//       AUTH_CALL_TIMEOUT_MS,
//       "isLoggedIn()",
//     );
//     if (!loggedIn) return null;
//     const info = await withTimeout(
//       magic.user.getInfo(),
//       AUTH_CALL_TIMEOUT_MS,
//       "getInfo()",
//     );
//     return info?.publicAddress ?? null;
//   } catch (err) {
//     console.error("[magic] getExistingSession failed:", err);
//     return null;
//   }
// }

// export async function logout() {
//   try {
//     await magic.user.logout();
//   } catch (err) {
//     console.error("Logout failed:", err);
//   }
// }

import { Magic } from "magic-sdk";
import { OAuthExtension } from "@magic-ext/oauth2";

export const magic = new Magic(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY, {
  network: {
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
  },
  extensions: [new OAuthExtension()],
});

export async function loginWithEmail(email) {
  console.log("[magic] Starting OTP flow, waiting for user...");
  // Yahan 'await' hona sab se zaroori hai!
  await magic.auth.loginWithEmailOTP({ email, showUI: true });
  console.log("[magic] OTP verified successfully!");
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
  // Agar URL mein magic parameters nahi hain, toh wapis jao
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
    window.history.replaceState({}, "", window.location.pathname); // Clear URL

    if (result?.magic?.userMetadata?.publicAddress) {
      return result.magic.userMetadata.publicAddress;
    }
  } catch (e) {
    console.warn(
      "[magic] OAuth Result Error (Missing PKCE), starting rescue loop...",
      e.message,
    );
    window.history.replaceState({}, "", window.location.pathname); // Clear URL on error too
  }

  // THE RESCUE LOOP (Retry 6 times, 1 second apart)
  console.log("[magic] Checking backend for session...");
  for (let i = 0; i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const address = await getExistingSession();
    if (address) {
      console.log(
        `[magic] Rescue successful on attempt ${i + 1}! Address:`,
        address,
      );
      return address;
    }
  }

  console.error("[magic] Rescue loop failed.");
  return null;
}

export async function logout() {
  await magic.user.logout();
}
