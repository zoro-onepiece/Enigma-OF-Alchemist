import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const port = process.env.PORT ? parseInt(process.env.PORT) : 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Splits the previous single ~1.55MB chunk so the browser can
        // fetch/cache/parse each vendor group independently, and so an
        // app-code-only change doesn't invalidate the (much larger,
        // rarely-changing) three.js chunk's cache on redeploy.
        //
        // '@zerodev/sdk' from the originally-requested list is NOT
        // included below — confirmed via package.json that this project
        // doesn't depend on it at all (web3/auth here is magic-sdk +
        // @magic-ext/oauth2 + ethers). Referencing a package with no node
        // in the actual module graph wouldn't error, just produce a dead
        // 0-byte chunk (the same failure mode an earlier 'vendor-react'
        // attempt hit for the same reason) — used the real dependency
        // names instead. 'zustand' added to vendor-react per the request's
        // intent (bundled with react/react-dom, the other tiny/stable
        // vendor deps), since it's a real dependency here.
        manualChunks: {
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          "vendor-web3": ["magic-sdk", "@magic-ext/oauth2", "ethers"],
          "vendor-react": ["react", "react-dom", "zustand"],
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: { overlay: false },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  }
});
