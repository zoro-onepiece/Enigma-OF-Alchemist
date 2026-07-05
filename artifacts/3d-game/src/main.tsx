import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// StrictMode double-mounts effects in dev, which is exactly the scenario
// the OAuth redirect handling in src/lib/magic.ts is hardened against
// (see the module-level `redirectPromise` singleton there). Keeping
// StrictMode on is intentional — do not remove it to "fix" login issues.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
