import { SylliBeeLockup } from './SylliBeeLogo';

export function SetupRequiredPage() {
  const siteUrl = `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/?$/, '/');

  return (
    <div className="auth-root">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-brand">
          <SylliBeeLockup
            chipSize={42}
            markSize={24}
            titleSize={20}
            subtitle={<div className="auth-subtitle">Sign-in is not available on this deployment yet</div>}
          />
        </div>

        <div className="auth-alert auth-alert--error" style={{ marginBottom: 16 }}>
          Supabase credentials were not included when this site was built, so accounts and cloud sync are disabled.
        </div>

        <ol style={{ margin: '0 0 18px', paddingLeft: 20, fontSize: 13.5, lineHeight: 1.55, color: 'rgba(35,38,43,.82)' }}>
          <li>
            In GitHub: <strong>Settings → Secrets and variables → Actions</strong> — add{' '}
            <code style={{ fontSize: 12 }}>VITE_SUPABASE_URL</code> and{' '}
            <code style={{ fontSize: 12 }}>VITE_SUPABASE_ANON_KEY</code>
          </li>
          <li>
            Enable <strong>Settings → Pages → GitHub Actions</strong> as the build source
          </li>
          <li>
            In Supabase → <strong>Authentication → URL configuration</strong>, set Site URL to{' '}
            <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{siteUrl}</code>
          </li>
          <li>Re-run the deploy workflow (or push a commit to <code style={{ fontSize: 12 }}>main</code>)</li>
        </ol>

        <p className="auth-footnote" style={{ marginTop: 0 }}>
          For local development, copy <code style={{ fontSize: 12 }}>.env.example</code> to <code style={{ fontSize: 12 }}>.env</code> and restart{' '}
          <code style={{ fontSize: 12 }}>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}
