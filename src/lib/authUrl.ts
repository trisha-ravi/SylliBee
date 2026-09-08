/** Canonical URL for Supabase email links (sign-up confirmation, password reset). */
export function getAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/') ? base : `${base}/`;
  return `${window.location.origin}${path}`;
}

export function isHostedDeploy(): boolean {
  return typeof window !== 'undefined' && /\.github\.io$/i.test(window.location.hostname);
}
