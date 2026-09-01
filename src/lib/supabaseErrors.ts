export function formatSupabaseError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Could not connect to Supabase';

  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  const msg = e.message ?? 'Unknown Supabase error';

  if (e.code === 'PGRST205' || /could not find the table/i.test(msg)) {
    return 'Database tables are missing. Run supabase/setup.sql in the Supabase SQL Editor, then try again.';
  }
  if (/user_id does not exist/i.test(msg) || /workspace_id does not exist/i.test(msg) || /column.*does not exist/i.test(msg)) {
    return 'Database uses the old schema. Run supabase/setup.sql in the Supabase SQL Editor, then sign in again.';
  }
  if (/row-level security/i.test(msg) || e.code === '42501') {
    return 'Database permissions blocked the request. Run supabase/setup.sql and sign in again.';
  }
  if (/invalid login credentials/i.test(msg)) {
    return 'Incorrect email or password.';
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Confirm your email using the link Supabase sent you, then sign in.';
  }
  if (/user already registered/i.test(msg)) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  return msg;
}
