// main.tsx — the starting point of the app.
// It loads the fonts and global styles, then tells React to draw <App />
// inside the <div id="root"> that lives in index.html.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fraunces, the serif used for titles. It's bundled with the game (no
// outside font service), and browsers only download the letters they need.
import '@fontsource-variable/fraunces'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks during development only; it has no effect in the final build.
  <StrictMode>
    <App />
  </StrictMode>,
)
