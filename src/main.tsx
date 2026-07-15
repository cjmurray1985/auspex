import { createRoot } from 'react-dom/client'
// Native MTG typography: Beleren (card names / titles), the Mana symbol font,
// and MPlantin (bundled with mana-font) for card-flavored body text.
import '@saeris/typeface-beleren-bold/index.css'
import 'mana-font/css/mana.min.css'
import './index.css'
import App from './App.tsx'
import { useDraft } from './store'

// Dev-only hook so end-to-end flows can be scripted from the console/automation.
if (import.meta.env.DEV) (window as unknown as { __draft: typeof useDraft }).__draft = useDraft

// NOTE: StrictMode is intentionally omitted. Its dev-only double-invocation of
// mount effects made framer-motion restart the entrance animations (the
// loading screen "starting then resetting"). It has no effect in production;
// removing it keeps the dev experience matching production.
createRoot(document.getElementById('root')!).render(<App />)
