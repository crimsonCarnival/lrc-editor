import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Auto-reload when a new deployment invalidates lazy-loaded chunks
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});
import { Toaster } from 'react-hot-toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/shared/ErrorBoundary.jsx'
import './i18n.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TooltipProvider>
        <App />
      </TooltipProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem',
            fontSize: '0.8125rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '0.625rem 1rem',
          },
          success: {
            iconTheme: { primary: '#1DB954', secondary: '#09090b' },
            duration: 2000,
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#09090b' },
            duration: 4000,
          },
        }}
      />
    </ErrorBoundary>
  </StrictMode>,
)
