# Dev Music Hub — Production Build

This package converts the original localStorage-based prototype into a real,
secure, multi-user application.

## Structure

- `backend/` — Node.js + Express API, Prisma + PostgreSQL, JWT auth,
  Cloudinary media storage, YouTube proxy. See `backend/.env.example`.
- `frontend/dev-music-hub.html` — the same UI, now talking to the backend
  over a REST API instead of localStorage/IndexedDB.
- `docs/API.md` — full endpoint reference.
- `docs/DEPLOYMENT.md` — step-by-step deploy instructions (Render/Railway/Fly
  + Vercel/Netlify + Neon/Supabase Postgres + Cloudinary + YouTube API).
- `docs/TEST_CHECKLIST.md` — manual QA checklist covering every user role
  and the required security checks.
- `docs/CHANGES.md` — exactly what changed and why, including the one small,
  necessary UI addition (a password field for user accounts).

## Quickstart (local)

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL at minimum to get started
npm install
npx prisma migrate dev --name init
npm run seed                # creates the first Developer account
npm run dev                 # http://localhost:4000
```

Then open `frontend/dev-music-hub.html` directly in a browser — it
auto-detects `localhost` and points at `http://localhost:4000` with no
configuration needed.

For production deployment, see `docs/DEPLOYMENT.md`.
