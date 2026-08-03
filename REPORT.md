# Smart MCQ — Project Report

Summary
-------
This project is a React + Vite prototype for an MCQ practice and exam-prep portal. It includes student and admin views, Supabase authentication and Postgres backend, and E2E test scaffolding.

How to run (developer)
----------------------
1. Install deps:

```bash
npm install
```

2. Ensure `.env` contains `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL`, and `VITE_ADMIN_EMAIL`.

3. Seed DB:

```bash
npm run seed
```

4. Run dev server and tests:

```bash
npm run dev
npm run test:e2e:install
npm run test:e2e
```

Contents
--------
- `src/pages` — `Home`, `StudentPortal`, `AdminPanel`, `Auth`
- `src/lib` — `supabaseClient.js`, `auth.js`
- `scripts` — `seedDatabase.js`, `syncUsers.js`, `checkSupabase.js`
- `tests` — Playwright E2E scaffold

Screenshots
-----------
Include screenshots of the running app in `screenshots/` if you want to embed them here.

Notes for submission
--------------------
- Rotate keys if they were shared. Keep `.env` out of version control.
- For production deploy, configure RLS policies in Supabase and use service role keys only on server-side.
