import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { SylliBeeLockup } from './SylliBeeLogo';

type AuthMode = 'signin' | 'signup';

interface AuthPageProps {
  /** Lets the user browse offline when they choose not to sign in yet. */
  onContinueOffline?: () => void;
}

export function AuthPage({ onContinueOffline }: AuthPageProps) {
  const auth = useAuth();
  const canAuth = isSupabaseConfigured;
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    auth.clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!canAuth) {
      setError('Sign-in is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await auth.signIn(trimmedEmail, password);
      } else {
        const { needsEmailConfirmation } = await auth.signUp(trimmedEmail, password);
        if (needsEmailConfirmation) {
          setMessage('Check your email for a confirmation link, then sign in.');
          setMode('signin');
        } else {
          setMessage('Account created — loading your calendar…');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-brand">
          <SylliBeeLockup
            chipSize={42}
            markSize={24}
            titleSize={20}
            subtitle={<div className="auth-subtitle">Your semester calendar, synced across devices</div>}
          />
        </div>

        <p className="auth-footnote" style={{ marginTop: -4, marginBottom: 12 }}>
          Sign in to load your saved courses and calendar. After sign-up, check your email if confirmation is required.
        </p>

        {!canAuth && (
          <div className="auth-alert auth-alert--error" style={{ marginBottom: 14 }}>
            Login isn’t connected yet. Add <code style={{ fontSize: 12 }}>VITE_SUPABASE_URL</code> and{' '}
            <code style={{ fontSize: 12 }}>VITE_SUPABASE_ANON_KEY</code> to <code style={{ fontSize: 12 }}>.env</code> (or GitHub
            Actions secrets), then restart.
          </div>
        )}

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${mode === 'signin' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@school.edu"
              disabled={submitting || !canAuth}
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              disabled={submitting || !canAuth}
            />
          </label>
          {mode === 'signup' && (
            <label className="auth-field">
              <span>Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                disabled={submitting || !canAuth}
              />
            </label>
          )}

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {message && <div className="auth-alert auth-alert--success">{message}</div>}

          <button type="submit" className="auth-submit" disabled={submitting || !canAuth}>
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-footnote">
          {mode === 'signin' ? (
            <>
              New to SylliBee?{' '}
              <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>

        {onContinueOffline && (
          <p className="auth-footnote" style={{ marginTop: 10 }}>
            <button type="button" className="auth-link" onClick={onContinueOffline}>
              Continue without signing in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
