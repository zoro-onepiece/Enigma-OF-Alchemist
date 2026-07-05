---
name: Magic.link SDK hangs instead of erroring on bad key
description: Magic SDK auth calls can hang forever (not reject) when the publishable key is invalid/placeholder — always wrap them with a timeout.
---

Magic SDK calls that talk to its hidden iframe/backend (`magic.user.isLoggedIn()`,
`magic.user.getInfo()`, `magic.oauth2.getRedirectResult()`,
`magic.oauth2.loginWithRedirect()`) can hang indefinitely — never resolving or
rejecting — when the publishable key is a placeholder/invalid value or the
backend responds with an unexpected status (e.g. 401/502) rather than raising a
catchable client-side error. Network reachability to `magic.link`/Google
domains being fine (curl succeeds) does NOT mean the SDK calls will settle.

**Why:** A UI that awaits these calls with only try/catch (no timeout) can get
stuck on a permanent loading spinner that looks identical to (or worse than) a
"redirect loop" bug report — the user just sees the app never finishing
loading. This is very hard to distinguish from a real integration bug without
adding a timeout and checking whether it fires.

**How to apply:** Wrap every Magic SDK call that can hang with a
`Promise.race`-style timeout (e.g. 8s) so auth bootstrap always resolves one
way or another. Before deep-diagnosing "OAuth redirect loop" style reports on
Magic.link integrations, check whether `VITE_MAGIC_PUBLISHABLE_KEY` (or
equivalent) is a real key from the Magic dashboard — a short/placeholder-looking
key is a strong signal the whole flow can never complete regardless of app code.

**Related pitfall — don't reuse one "loading" flag for two different loading
phases.** A root component often needs (a) an initial mount-time bootstrap
check (redirect/session restore) that should hide the login menu entirely
until resolved, and (b) a per-click "login attempt in flight" state that
should show a spinner *inside* the still-visible menu. Reusing a single
boolean for both means clicking login re-triggers the bootstrap's
blank-screen gate, hiding the button/spinner behind an empty screen — this
looks exactly like a hang/bounce bug to e2e testing even though the
underlying auth logic is correct. Keep bootstrap-gating state and
button-loading state as two separate flags.
