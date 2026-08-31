# Dev Music Hub — API Documentation

Base URL: `https://<your-backend-host>` (all routes below are prefixed with `/api`).

Auth is via httpOnly cookies (`dmh_access`, `dmh_refresh`) set by the login/register
endpoints. The frontend must send `credentials: 'include'` on every request (it
already does, via the `api` client). There is no header-based token to copy
around — CSRF-relevant mutations rely on the cookie's `SameSite` policy plus
CORS being locked to your real frontend origin.

Role hierarchy: `user < manager < developer`. "Manager or above" means manager
and developer can call it; "Developer only" means only the single developer
account can.

---

## Auth — `/api/auth`

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/register` | none | `{ name, email, mobile, password, avatarUrl? }` | Creates a User, logs them in (sets cookies). Password: 8+ chars, 1 letter, 1 number. |
| POST | `/login` | none | `{ identifier, password }` | `identifier` = email or mobile. |
| POST | `/admin/login` | none | `{ identifier, password }` | Logs in a Manager or the Developer account. |
| POST | `/refresh` | refresh cookie | — | Silently called by the frontend on a 401; issues a new access token. |
| POST | `/logout` | any | — | Clears both cookies. |
| GET | `/me` | any | — | Returns the current session's user/admin object. |
| PATCH | `/me` | any | `{ name?, email?, avatarUrl? }` | Updates profile. `email` only applies to Users. |
| POST | `/change-password` | any | `{ currentPassword, newPassword }` | Works for both Users and Managers/Developer. |

Rate limited: 20 attempts / 15 min on register/login/admin-login/change-password.

## Songs — `/api/songs`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/?page=&pageSize=&q=` | none | Paginated, searchable (title/artist). |
| GET | `/:id` | none | |
| POST | `/` | manager+ | `{ title, artist, img?, youtubeVideoId? }`. Deduped by `youtubeVideoId` if provided. |
| PATCH | `/:id` | manager+ | |
| DELETE | `/:id` | manager+ | |

## Categories / Artists / Playlists — `/api/categories`, `/api/artists`, `/api/playlists`

Identical shape for all three (a named collection of songs):

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | none | Returns all items with their songs embedded. |
| GET | `/:id` | none | |
| POST | `/` | manager+ | `{ name, img? }` |
| PATCH | `/:id` | manager+ | `{ name?, img? }` |
| DELETE | `/:id` | manager+ | |
| POST | `/bulk-delete` | manager+ | `{ ids: [...] }` |
| POST | `/:id/songs` | manager+ | `{ songId }` **or** `{ song: { title, artist, img, youtubeVideoId } }` — attaches an existing song or creates+attaches a new one (deduped by video ID). |
| DELETE | `/:id/songs/:songId` | manager+ | |
| POST | `/:id/songs/bulk-delete` | manager+ | `{ songIds: [...] }` |

## Hero items — `/api/hero`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | none | |
| POST | `/` | manager+ | `{ mediaType: 'YOUTUBE'|'PHOTO'|'VIDEO', img, title?, artist?, caption?, youtubeVideoId?, mediaUrl?, mediaPublicId? }`. For PHOTO/VIDEO, `mediaUrl` must come from `/api/uploads/hero-photo` or `/api/uploads/hero-video` first. |
| DELETE | `/:id` | manager+ | Also deletes the Cloudinary asset if one is attached. |
| POST | `/bulk-delete` | manager+ | `{ ids: [...] }` |

## Likes — `/api/likes` (User accounts only)

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Current user's liked songs. |
| POST | `/` | `{ songId }` or `{ song: {...} }` |
| DELETE | `/:songId` | |

## Listening history — `/api/history` (User accounts only)

| Method | Path | Notes |
|---|---|---|
| GET | `/?sinceHours=` | Most recent 200 plays, optionally filtered. |
| POST | `/` | `{ songId }` or `{ song: {...} }` — records one play. |

## My Music — `/api/mymusic` (User accounts only)

Same shape as Likes, plus `POST /bulk-delete` with `{ songIds: [...] }`.

## Feedback

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/feedback` | any logged-in account | `{ message }`. Rate limited (10/hour). |
| GET | `/api/admin/feedback` | manager+ | List all feedback. |
| PATCH | `/api/admin/feedback/:id` | manager+ | `{ status: 'OPEN'|'REVIEWED'|'RESOLVED' }` |
| DELETE | `/api/admin/feedback/:id` | manager+ | |

(`/api/feedback` also accepts GET/PATCH/DELETE and `/api/admin/feedback` also
accepts POST — same handlers mounted twice — but use the paths above as the
canonical ones.)

## Managers — `/api/managers` (Developer only)

| Method | Path | Body |
|---|---|---|
| GET | `/` | — |
| POST | `/` | `{ name, email, mobile?, password }` |
| DELETE | `/:id` | — |

## Admin misc — `/api/admin`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users?page=&pageSize=&q=` | manager+ | Read-only user list. |
| GET | `/login-logs?page=&pageSize=` | manager+ | Login activity. |
| GET | `/brand` | none | `{ brand }` |
| PATCH | `/brand` | manager+ | `{ brand }` |
| GET | `/dev-photo` | none | Public — for the "About Developer" popup. |
| PATCH | `/dev-photo` | developer only | `{ photoUrl, publicId? }` |

## YouTube proxy — `/api/youtube`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/search?q=&maxResults=` | manager+ | Server holds the real API key; rate limited to 15/min to protect quota. |

## Uploads — `/api/uploads` (→ Cloudinary)

| Method | Path | Auth | Field | Notes |
|---|---|---|---|---|
| POST | `/avatar` | any logged-in | `file` (image) | Max 15MB. |
| POST | `/hero-photo` | manager+ | `file` (image) | Max 15MB. |
| POST | `/hero-video` | manager+ | `file` (video) | Max 250MB. Returns `{ url, publicId, poster }`. |
| POST | `/dev-photo` | developer only | `file` (image) | |
| POST | `/cover` | manager+ | `file` (image) | Generic category/artist/playlist cover. |

All uploads return `{ url, publicId }` (or `poster` too for video) — the
frontend then sends that URL to the relevant create/update endpoint. The raw
API key/secret never leave the server, and the response never includes them.

## Error shape

Every error response is `{ "error": "human-readable message" }`, optionally
with `{ "details": [...] }` for validation errors. HTTP status codes are used
conventionally (400/401/403/404/409/413/429/503/500).
