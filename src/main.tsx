import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import App from './App';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

function Root() {
  const auth = useAuth();

  if (isSupabaseConfigured && auth.loading) {
    return (
      <div
        className="app-root"
        style={{
          fontFamily: "'Instrument Sans', ui-sans-serif, -apple-system, system-ui, sans-serif",
          color: '#23262B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(120% 95% at 50% 0%, #FFFFFF 0%, #F8F8F9 38%, #F1F1F3 72%, #EAEAEE 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-.2px' }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !auth.user) {
    return <AuthPage />;
  }

  return (
    <App
      key={auth.user?.id ?? 'local'}
      userId={auth.user?.id ?? null}
      userEmail={auth.user?.email}
      onSignOut={auth.user ? () => auth.signOut() : undefined}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
);
