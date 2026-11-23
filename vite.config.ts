import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the game from a sub-folder (…github.io/counterweight/),
  // not the site root. './' makes every file link relative, so it works there
  // and anywhere else, whatever the folder is called.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // Put the year of daily puzzles in its own file ("puzzles-….js").
        // It's big but rarely changes, so browsers can keep it cached
        // while the (small) game code gets updated.
        manualChunks(id) {
          if (id.endsWith('daily.json')) return 'puzzles'
        },
      },
    },
  },
})
