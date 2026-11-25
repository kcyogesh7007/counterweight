// capacitor.config.ts — settings for the Android app.
//
// Capacitor wraps the built game (the `dist` folder) inside a real Android
// app. The game files travel INSIDE the app, so it works with no internet.
//
// To make / update the Android app:  npm run build:android
// Then open the `android` folder in Android Studio to run or package it.

import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // The app's permanent ID on Google Play. It can NEVER change after the
  // first upload. Based on the GitHub Pages address, so it's unique to us.
  appId: 'io.github.kcyogesh7007.counterweight',
  // The name under the icon on the phone
  appName: 'Counterweight',
  // Where the built game is
  webDir: 'dist',
  android: {
    // The game's dark background while the app starts
    backgroundColor: '#0b0907',
  },
  plugins: {
    SystemBars: {
      // The game is dark, so the clock, battery and other status-bar icons
      // should be LIGHT ('DARK' means "for a dark background").
      style: 'DARK',
    },
  },
}

export default config
