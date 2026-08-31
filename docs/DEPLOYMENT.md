# Deployment Guide — Dev Music Hub

This app is now a real client/server application:

```
Frontend (static HTML)  →  Backend (Node/Express)  →  PostgreSQL
                                    │
                                    ├──→ YouTube Data API v3 (server-side key)
                                    └──→ Cloudinary (media storage)
```

## 1. Database (PostgreSQL)

Pick any managed Postgres provider — these steps use **Neon** as an example,
but Supabase/Railway/Render Postgres all work the same way.

1. Create a new Postgres project/database.
2. Copy the connection string (make sure it includes `?sslmode=require`).
3. You'll paste this into `DATABASE_URL` in the backend's `.env`.

## 2. Cloud storage (Cloudinary)

1. Create a free Cloudinary account at cloudinary.com.
2. From the dashboard, copy your **Cloud name**, **API key**, and **API secret**.
3. These go into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## 3. YouTube Data API key

1. In the Google Cloud Console, create a project (or reuse one).
2. Enable the **YouTube Data API v3**.
3. Create an API key under Credentials. Optionally restrict it to the YouTube
   Data API and to your backend server's IP.
4. This goes into `YOUTUBE_API_KEY` — server-side only, never in the frontend.

## 4. Backend deployment (Render, Railway, or Fly.io)

These steps use **Render** as the example.

1. Push the `backend/` folder to a Git repository (do **not** commit `.env` —
   `.gitignore` already excludes it).
2. In Render, create a new **Web Service** pointing at that repo/folder.
3. Build command: `npm install && npx prisma generate`
4. Start command: `npm start`
5. Add environment variables (from `.env.example`):
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (generate with `openssl rand -base64 48`)
   - `YOUTUBE_API_KEY`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CORS_ORIGIN` — set this to your deployed **frontend** URL (e.g.
     `https://dev-music-hub.vercel.app`). Comma-separate multiple origins.
   - `NODE_ENV=production`
6. Deploy. Once live, run the database migration and seed **once**, either via
   Render's shell or a one-off job:
   ```bash
   npx prisma migrate deploy
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ng-Passw0rd1' npm run seed
   ```
   This creates the first Developer account (hashed password only — the
   plaintext is never stored or sent to the frontend) and a small demo catalog.
7. Note your backend's public URL, e.g. `https://dev-music-hub-api.onrender.com`.

## 5. Frontend deployment (Vercel or Netlify)

The frontend is a single static HTML file — no build step needed.

1. Open `frontend/dev-music-hub.html` and set the API base near the top of
   `<head>`:
   ```html
   <script>
     window.DMH_API_BASE = 'https://dev-music-hub-api.onrender.com';
   </script>
   ```
   Leave it as `''` only if you're serving the frontend from the *exact same*
   origin as the backend (uncommon for this split setup).
2. Deploy the file as a static site on Vercel/Netlify (drag-and-drop or
   connect the repo — no framework, no build command needed).
3. Copy the resulting frontend URL and make sure it's included in the
   backend's `CORS_ORIGIN` (step 4.5 above), then redeploy the backend if you
   changed it.

## 6. First login

1. Visit the deployed frontend.
2. Open the login modal → Admin tab → Developer sub-tab.
3. Sign in with the email/mobile and password you set in `ADMIN_PASSWORD`
   during seeding.
4. Immediately go to Settings → Profile → Update Password to set a password
   only you know (the seed password may have been visible in your deploy
   logs/shell history).
5. From the Dashboard, add managers, categories, artists, playlists, and hero
   items as needed.

## 7. Local development

Backend:
```bash
cd backend
cp .env.example .env   # fill in real values, or point DATABASE_URL at a local Postgres
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev             # http://localhost:4000
```

Frontend: just open `frontend/dev-music-hub.html` in a browser (or serve it
with any static server, e.g. `npx serve frontend`). With `DMH_API_BASE` left
as `''`, the app auto-detects `localhost`/`127.0.0.1` and points at
`http://localhost:4000` for you — no edit needed for local dev.

Make sure `CORS_ORIGIN` in the backend's `.env` includes whatever origin
you're opening the frontend from (e.g. `http://localhost:5500` if using the
VS Code Live Server extension, or `null`/`file://` won't work with
`credentials: 'include'` — serve the HTML over `http://` for local testing).

## 8. Database schema changes later

Whenever you edit `backend/prisma/schema.prisma`:
```bash
npx prisma migrate dev --name <description>   # local
npx prisma migrate deploy                      # production
```
