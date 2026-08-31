# What Changed — Dev Music Hub Production Migration

## Files delivered

```
backend/                          NEW — Node/Express + Prisma API server
  prisma/schema.prisma            NEW — PostgreSQL schema (14 models)
  prisma/seed.js                  NEW — creates first Developer account from env vars + demo catalog
  src/app.js                      NEW — Express app: security middleware, route mounting
  src/server.js                   NEW — entrypoint, env validation
  src/lib/prisma.js               NEW — Prisma client singleton
  src/lib/cloudinary.js           NEW — cloud storage upload/delete helpers
  src/middleware/auth.js          NEW — JWT cookie auth + role-based authorization
  src/middleware/errorHandler.js  NEW — centralized error responses
  src/middleware/rateLimiters.js  NEW — auth/feedback/YouTube/upload/general rate limits
  src/utils/*.js                  NEW — validation schemas, JWT helpers, song dedupe logic
  src/routes/*.routes.js          NEW — auth, songs, categories, artists, playlists, hero,
                                          likes, history, mymusic, feedback, managers, admin,
                                          youtube, uploads
  .env.example                    NEW
  .gitignore                      NEW
  package.json                    NEW

frontend/dev-music-hub.html       MODIFIED — same UI/CSS, persistence layer replaced (see below)

docs/API.md                       NEW — full endpoint reference
docs/DEPLOYMENT.md                NEW — step-by-step deploy instructions
docs/TEST_CHECKLIST.md            NEW — manual test checklist
docs/CHANGES.md                   NEW — this file
```

The CSS block in `dev-music-hub.html` is **byte-for-byte identical** to the
original — no colors, layout, or component markup were changed except for
three small, necessary additions (see "UI changes" below).

## How the old localStorage system was replaced

The original app kept a single in-memory `Store` object that was loaded from
and saved back to `localStorage` on every mutation (`lsGet`/`lsSet`), plus
per-user keys like `dmh_likes_<id>`, and used IndexedDB for uploaded hero
photos/videos. Session and even the developer's password lived in the
browser.

The rewrite keeps the same `Store` object and the same render functions
(`renderHero`, `renderSongs`, `renderDashboard`, etc.) completely unchanged —
they still just read plain JS objects/arrays. What changed is **how those
objects get populated and mutated**:

| Old | New |
|---|---|
| `lsGet('dmh_categories', DEFAULT_CATEGORIES)` at load | `Store.categories` populated by `GET /api/categories` in `loadAppData()` at startup |
| `Store.categories.push(...); saveCategories()` | `await api.post('/api/categories', {...})`, then push the **server's** response (with a real DB id) into `Store.categories` |
| `dmh_likes_<userId>` / `dmh_history_<userId>` / `dmh_mymusic_<userId>` | `GET/POST/DELETE /api/likes`, `/api/history`, `/api/mymusic` — scoped to the authenticated user via their session cookie, so they follow the account across devices |
| `session` object read from `localStorage.dmh_session` | `session` restored via `GET /api/auth/me`, which relies on an httpOnly cookie the server set at login — never readable/writable by frontend JS |
| Hardcoded `DEV_CREDS` object checked in the browser | Removed entirely. First Developer account is created once, server-side, by `prisma/seed.js` from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars, storing only an Argon2 hash. Login goes through `POST /api/auth/admin/login`, verified server-side. |
| YouTube API key typed into a dashboard field, stored in `localStorage`, used directly from the browser | Removed from the frontend entirely. `YOUTUBE_API_KEY` lives only in the backend's environment; the frontend calls `GET /api/youtube/search`, which the backend proxies. |
| Hero photos/videos and the developer photo stored as base64/Blob in IndexedDB | Uploaded via `multipart/form-data` to `/api/uploads/*`, which streams the file straight to Cloudinary (no disk writes) and returns a permanent HTTPS URL. Only that URL is stored in the database. |
| Admin dashboard read/wrote `Store.managers`/`Store.feedback`/`Store.users`/`Store.loginlog` from `localStorage` | These are fetched on-demand from `GET /api/managers`, `/api/admin/feedback`, `/api/admin/users`, `/api/admin/login-logs` the first time their dashboard tab is opened, and mutated via the corresponding REST endpoints. |

Every write from the frontend (add category, like a song, submit feedback,
upload a hero video, etc.) now round-trips through a real HTTP request to the
backend, which re-validates the input and re-checks the caller's role before
touching PostgreSQL — the frontend's `isAdmin()`/`isDeveloper()` checks that
remain are purely cosmetic (which buttons to show), never the actual
authorization boundary.

## UI changes (the only ones made)

The brief asked for zero UI changes, but real per-account security for
**regular users** (not just admins) requires users to have a password — the
original app's "user login" only collected name/email/mobile, so anyone who
knew your email could load your likes and history. Three small additions
were made, using the existing visual style (same modal, same input/button
classes):

1. A **password field** was added to the user login/register form.
2. A **"Create Account" / "Sign In" toggle** was added above that form
   (previously the same form silently created-or-logged-in based on whether
   the email matched an existing record).
3. A **"Current Password" / "New Password"** pair was added to the Edit
   Profile modal, so users and admins can change their password after login.

Everything else — colors, layout, navigation, cards, the music player,
dashboard structure, mobile/desktop responsive behavior — is untouched.

## Known simplifications / follow-ups

- Likes, history, and My Music are scoped to **User** accounts only (not
  Manager/Developer) — this matches how a real product would separate
  "social/listening features" from "admin tooling," but differs slightly
  from the prototype, where any logged-in role could like a song.
- The developer's "About" photo and login logs use simple GET endpoints
  without heavy caching; fine at this scale, worth adding a CDN/cache layer
  if traffic grows significantly.
- CSRF protection currently relies on `SameSite` cookies + strict CORS
  origin checking rather than a separate CSRF token — sufficient for a
  cookie-based single-frontend setup, but worth revisiting if you ever add
  a second trusted frontend origin.
