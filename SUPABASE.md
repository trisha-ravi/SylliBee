# Supabase setup for SylliBee

## 1. Enable email sign-in

In [Supabase Dashboard](https://supabase.com/dashboard/project/hehauudvuplovalouwik/auth/providers):

1. Open **Authentication → Providers → Email**
2. Ensure **Email** is enabled
3. For development, you can disable **Confirm email** so sign-up works immediately (optional)

## 2. Run the database schema

1. Open [SQL Editor](https://supabase.com/dashboard/project/hehauudvuplovalouwik/sql/new)
2. Copy the entire contents of [`supabase/setup.sql`](./supabase/setup.sql)
3. Paste → **Run**

This creates per-user tables secured with Row Level Security (`auth.uid()`).

## 3. Environment variables

Create `.env` in the project root:

```env
VITE_SUPABASE_URL=https://hehauudvuplovalouwik.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Settings → API>
```

Restart `npm run dev` after changes.

## How auth works

- **Sign up** — email + password creates a Supabase Auth account
- **Sign in** — loads that user's courses, events, and preferences from the database
- **Sign out** — returns to the login screen

Without `.env`, the app runs in local demo mode (no login required).

## What syncs per account

- Imported courses and calendar events
- Hidden courses, completed to-dos, view/filter preferences
