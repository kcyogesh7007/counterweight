// main.tsx — the starting point of the app.
// It loads the global styles, then tells React to draw <App /> inside
// the <div id="root"> that lives in index.html.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // StrictMode adds extra checks during development only; it has no effect in the final build.
  <StrictMode>
    <App />
  </StrictMode>,
)
