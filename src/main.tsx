import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { SetupRequiredPage } from './components/SetupRequiredPage';
import App from './App';
import { isHostedDeploy } from './lib/authUrl';
import { isGuestMode, setGuestMode } from './lib/guestMode';
import { isSupabaseConfigured } from './lib/supabase';
import './index.css';

function Root() {
  const auth = useAuth();
  const [guest, setGuest] = useState(() => isGuestMode());

  useEffect(() => {
    if (auth.user) {
      setGuestMode(false);
      setGuest(false);
    }
  }, [auth.user]);

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

  // Hosted deploy without secrets: login is impossible until Actions secrets are set.
  if (!isSupabaseConfigured && isHostedDeploy()) {
    return <SetupRequiredPage />;
  }

  const enterGuest = () => {
    setGuestMode(true);
    setGuest(true);
  };

  const exitGuestToLogin = () => {
    setGuestMode(false);
    setGuest(false);
  };

  // Prefer login whenever Supabase is configured and the user is signed out.
  if (isSupabaseConfigured && !auth.user && !guest) {
    return <AuthPage onContinueOffline={enterGuest} />;
  }

  // Local / offline without Supabase: still land on auth so login setup is visible.
  if (!isSupabaseConfigured && !guest) {
    return <AuthPage onContinueOffline={enterGuest} />;
  }

  return (
    <App
      key={auth.user?.id ?? 'local'}
      userId={auth.user?.id ?? null}
      userEmail={auth.user?.email}
      onSignOut={auth.user ? () => auth.signOut() : undefined}
      onSignIn={!auth.user ? exitGuestToLogin : undefined}
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
