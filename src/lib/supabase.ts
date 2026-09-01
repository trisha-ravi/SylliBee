import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PLACEHOLDER_KEY_PATTERNS = ['your_anon_key', 'replace_me', 'changeme'];

export const isSupabaseConfigured = Boolean(
  url
  && anonKey
  && !PLACEHOLDER_KEY_PATTERNS.some((p) => anonKey.toLowerCase().includes(p)),
);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}
