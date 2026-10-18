import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The API gateway as published by docker compose (GATEWAY_PORT, default 4400)
const gateway = process.env.GATEWAY_URL ?? "http://localhost:4400";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon-32.png", "favicon-48.png", "apple-touch-icon.png"],
      manifest: {
        name: "Monkii Tribe",
        short_name: "Monkii",
        description: "Stream, support and meet the artists you love.",
        lang: "en",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#1A0F05",
        background_color: "#1A0F05",
        categories: ["music", "entertainment"],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      // Our own service worker (src-sw/sw.ts): app shell + image cache + web push (NOT-03)
      strategies: "injectManifest",
      srcDir: "src-sw",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates do not re-download them
        manualChunks: {
          react: ["react", "react-dom", "react-router"],
          data: ["@tanstack/react-query", "i18next", "react-i18next", "zod", "react-hook-form"],
          hls: ["hls.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Same-origin API in development, so the refresh cookie just works
    proxy: {
      "/api": { target: gateway, changeOrigin: false },
      "/docs": { target: gateway, changeOrigin: false },
    },
  },
  preview: {
    port: 8080,
    proxy: { "/api": gateway },
  },
});
