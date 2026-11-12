import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ConfettiProvider } from './components/Confetti'
import { ToastProvider } from './components/Toast'
import './lib/install'
import { initTheme } from './lib/theme'
import './styles.css'

initTheme()
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfettiProvider>
          <App />
        </ConfettiProvider>
      </ToastProvider>
    </MotionConfig>
  </StrictMode>,
)
