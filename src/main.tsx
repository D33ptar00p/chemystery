import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'
import './designs.css'
import { useSandboxStore } from './state/useSandboxStore'

// Dev-only handle for debugging and end-to-end checks. Stripped from production
// builds by the import.meta.env.DEV guard.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__chemystery = useSandboxStore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
