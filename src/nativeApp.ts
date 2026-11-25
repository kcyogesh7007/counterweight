// nativeApp.ts — small extras for when the game runs inside the Android app.
//
// THE PHONE'S BACK BUTTON: the game moves between screens using the
// browser's history (see hooks/useScreens.ts), just like web pages. The app
// sends Android's Back button to that history: Back returns to the previous
// screen, and on the first screen (home) it closes the app, as Android users
// expect.
//
// On the website this does nothing (the browser's own Back already works).

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export function setUpNativeApp(): void {
  if (!Capacitor.isNativePlatform()) return
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void App.exitApp()
  })
}
