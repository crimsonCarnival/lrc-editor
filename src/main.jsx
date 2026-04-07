import { StrictMode, lazy, Suspense } from 'react'
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
import { AuthProvider } from './contexts/AuthContext.jsx'
import { useAuthContext } from './contexts/useAuthContext.js'
import { Spinner } from './components/ui/skeleton'
import './i18n.js'

const AuthPage = lazy(() => import('./components/Auth/AuthPage.jsx'));

function Root() {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Spinner size={24} className="text-primary" />
        </div>
      }>
        <AuthPage />
      </Suspense>
    );
  }

  return (
    <TooltipProvider>
      <App />
    </TooltipProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Root />
      </AuthProvider>
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
