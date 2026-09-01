# SylliBee

A student academic calendar with glassmorphism UI, course management, and Beezy — your AI study assistant.

## Features

- **Week / Month / Agenda / Semester** calendar views
- **Course & club filtering** with color-coded events
- **Syllabus upload flow** (demo) for bulk semester import
- **Beezy assistant** for study recommendations and workload Q&A
- **To-do list** and **Up Next** sidebar panels
- **Event detail modals** with Beezy tips

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## GitHub Pages

Live site (after deploy): **https://trisha-ravi.github.io/SylliBee/**

### One-time setup

1. Push this repo to `main` on GitHub.
2. In the repo on GitHub: **Settings → Pages → Build and deployment**
   - **Source:** GitHub Actions
3. **Settings → Secrets and variables → Actions** — add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In [Supabase](https://supabase.com/dashboard) → **Authentication → URL configuration**, add:
   - Site URL: `https://trisha-ravi.github.io/SylliBee/`
   - Redirect URL: `https://trisha-ravi.github.io/SylliBee/**`

Every push to `main` runs `.github/workflows/deploy.yml` and updates the site.

### Test the Pages build locally

```bash
npm run build:pages
npm run preview:pages
```

Open the URL shown (paths use the `/SylliBee/` base, same as production).

## Tech stack

- React 18 + TypeScript
- Vite

## Design

UI based on the SylliBee design spec — earthy green palette, Instrument Sans typography, and frosted-glass panels.
