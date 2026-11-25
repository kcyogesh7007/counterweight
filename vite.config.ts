import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// `mode` is 'android' for the Android app build (npm run build:android).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Makes the game a "PWA" (installable web app):
    //  - a manifest: the app's name, icons and colours, so phones can add it
    //    to the home screen and open it full-screen like a normal app;
    //  - a service worker: a small helper that keeps a copy of the game's
    //    files, so it also works with no internet. When a new version is
    //    published, the helper fetches it in the background and the player
    //    gets it the next time they open the game.
    // It only runs in the built game (npm run build), not while developing.
    // The Android app leaves it out: the app already carries every file inside it.
    mode !== 'android' &&
      VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Counterweight: Balance Puzzle',
        short_name: 'Counterweight',
        description: 'A daily logic puzzle. Hang every weight so every bar balances.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0907',
        theme_color: '#0e0c0a',
        categories: ['games', 'puzzle', 'education'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Keep a copy of everything the game needs (code, styles, puzzles, fonts, icons)
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Never keep visitor counting in the offline copy
        navigateFallbackDenylist: [/goatcounter/],
      },
    }),
  ],
  // GitHub Pages serves the game from a sub-folder (…github.io/counterweight/),
  // not the site root. './' makes every file link relative, so it works there
  // and anywhere else, whatever the folder is called.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Put the puzzle lists (daily + levels) in their own file ("puzzles-….js").
        // It's big but rarely changes, so browsers can keep it cached
        // while the (small) game code gets updated.
        manualChunks(id) {
          if (id.endsWith('daily.json') || id.endsWith('levels.json')) return 'puzzles'
        },
      },
    },
  },
}))
