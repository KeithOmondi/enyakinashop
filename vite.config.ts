/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Tests get their own cache so they never clash with a running dev server (they share node_modules/.vite otherwise).
  cacheDir: process.env.VITEST ? 'node_modules/.vite-test' : undefined,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', not 'autoUpdate': an automatic reload in the middle of a sale
      // would interrupt the cashier. The app shows an "update available" toast instead.
      registerType: 'prompt',
      injectRegister: false, // registered from src/app/PwaUpdatePrompt.tsx
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png'],
      manifest: {
        // Generic on purpose: one installable app serves both businesses.
        // The business name and logo are shown inside the app after login.
        name: 'Shop POS',
        short_name: 'Shop',
        description: 'Point of sale and stock for the shop',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#A7D7C5',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the app shell only, so the app opens instantly and shows its
        // offline state. API responses are NEVER cached by the service worker:
        // stock levels and prices must be live, and responses carry business data.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      // Keep the service worker out of `vite dev` to avoid stale-cache confusion.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Admin runs on 5173; the shop runs on 5174. Add both to the backend's CORS_ORIGINS.
    port: 5174,
    strictPort: true,
  },
  preview: { port: 4174, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    env: { VITE_API_URL: 'http://api.test/api' },
  },
});
