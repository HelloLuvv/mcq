# Smart MCQ — Final Year Project

Local setup

1. Duplicate `.env.example` to `.env` and fill the values (or use the `.env` created locally).

2. Install dependencies:

```bash
npm install
```

3. Seed the database (uses `DATABASE_URL` in `.env`):

```bash
npm run seed
```

4. Start the dev server:

```bash
npm run dev
```

Admin access

- Set `VITE_ADMIN_EMAIL` in `.env` to the email of the admin account that will sign in.

Notes

- Keep `.env` secret. Rotate Supabase keys if they are exposed.
- To protect production writes, configure Supabase Row-Level Security (RLS) and policies in the Supabase dashboard.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
