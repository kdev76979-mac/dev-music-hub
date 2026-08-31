<div align="center">

# 🎵 Dev Music Hub

**A production-grade, multi-user music platform** — built with Node.js, Express, Prisma, PostgreSQL and a slick vanilla-JS frontend.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](#-license)

![GitHub last commit](https://img.shields.io/github/last-commit/kdev76979-mac/dev-music-hub)
![GitHub repo size](https://img.shields.io/github/repo-size/kdev76979-mac/dev-music-hub)
![GitHub stars](https://img.shields.io/github/stars/kdev76979-mac/dev-music-hub?style=social)
![GitHub forks](https://img.shields.io/github/forks/kdev76979-mac/dev-music-hub?style=social)

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quickstart](#-quickstart) • [API](#-api-overview) • [Deployment](#-deployment) • [Docs](#-documentation)

</div>

---

## 📖 About

Dev Music Hub started as a `localStorage`-based prototype and has been rebuilt into a **real, secure, multi-user application**. Users can browse, like, and build playlists; managers and developers curate the catalog, hero banners, and artists — all backed by a proper REST API, JWT auth, and cloud media storage.

<details>
<summary><strong>🖼️ Why this rebuild?</strong> (click to expand)</summary>

<br>

The original version stored everything in the browser's `localStorage` / `IndexedDB`, which meant no real accounts, no shared data between devices, and no way to separate what regular users vs. managers/developers could do. This version replaces that with:

- A **Postgres database** via Prisma, so data is persistent and shared
- **httpOnly cookie-based JWT auth** instead of anything client-readable
- **Role-based access** (`user` < `manager` < `developer`)
- **Cloudinary** for media uploads instead of base64 blobs in the browser

</details>

---

## ✨ Features

| | |
|---|---|
| 🔐 **Secure Auth** | JWT via httpOnly cookies, argon2 password hashing, rate-limited login/register |
| 👥 **Role-Based Access** | `user`, `manager`, `developer` — each with different permissions |
| 🎧 **Music Catalog** | Songs, categories, artists, and playlists with full CRUD |
| ❤️ **Likes & History** | Per-user liked songs and listening history |
| 🖼️ **Hero Banners** | Manager-curated homepage banners (YouTube / photo / video) |
| ☁️ **Cloud Media** | Cloudinary-backed uploads for photos and videos |
| 📺 **YouTube Integration** | Server-side YouTube Data API v3 proxy (key never exposed to the browser) |
| 💬 **Feedback System** | Built-in user feedback collection |
| 🛡️ **Hardened by Default** | Helmet, CORS allow-list, rate limiting on sensitive routes |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express |
| **Database / ORM** | PostgreSQL, Prisma |
| **Auth** | JSON Web Tokens (httpOnly cookies), Argon2 |
| **Media Storage** | Cloudinary |
| **Validation** | Zod |
| **Security** | Helmet, express-rate-limit, CORS |
| **Frontend** | Vanilla HTML/JS (single-page, talks to the API via `fetch`) |

</div>

---

## 📂 Project Structure

```
dev-music-hub/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── routes/           # auth, songs, categories, artists, playlists,
│   │   │                     # hero, likes, history, mymusic, feedback,
│   │   │                     # managers, admin, upload, youtube
│   │   ├── middleware/       # auth, rate limiters, error handler
│   │   ├── lib/               # prisma & cloudinary clients
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma     # 16 models: User, AdminAccount, Song, ...
│   │   └── seed.js           # creates the first Developer account
│   └── .env.example
├── frontend/
│   └── dev-music-hub.html    # the UI — talks to the backend over REST
└── docs/
    ├── API.md                # full endpoint reference
    ├── DEPLOYMENT.md         # step-by-step deploy guide
    ├── TEST_CHECKLIST.md     # manual QA checklist
    └── CHANGES.md            # what changed from the prototype, and why
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js **18+**
- A PostgreSQL database ([Neon](https://neon.tech), [Supabase](https://supabase.com), Railway, or local)
- A [Cloudinary](https://cloudinary.com) account (free tier is fine)
- A YouTube Data API v3 key ([Google Cloud Console](https://console.cloud.google.com))

### 1. Clone & install
```bash
git clone https://github.com/kdev76979-mac/dev-music-hub.git
cd dev-music-hub/backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Fill in at minimum `DATABASE_URL` — see `.env.example` for the full list (JWT secrets, Cloudinary keys, YouTube API key, admin seed account).

### 3. Set up the database
```bash
npx prisma migrate dev --name init
npm run seed        # creates the first Developer account from your .env
```

### 4. Run it
```bash
npm run dev          # → http://localhost:4000
```

Open `frontend/dev-music-hub.html` directly in your browser — it auto-detects `localhost` and points at `http://localhost:4000` with zero configuration.

> 📘 For production deployment (Render/Railway/Fly + Vercel/Netlify + managed Postgres), see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 🔌 API Overview

Base URL: `https://<your-backend-host>/api` — auth via httpOnly cookies, role hierarchy `user < manager < developer`.

<details>
<summary><strong>Click to expand endpoint summary</strong></summary>

<br>

| Resource | Base Path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, admin/login, refresh, logout, me, change-password |
| Songs | `/api/songs` | Paginated + searchable; manager+ for writes |
| Categories / Artists / Playlists | `/api/categories`, `/api/artists`, `/api/playlists` | Same shape — named collections of songs |
| Hero items | `/api/hero` | YouTube / photo / video banners, manager+ |
| Likes | `/api/likes` | Per-user liked songs |
| History | `/api/history` | Listening history, last 200 plays |
| Uploads | `/api/uploads` | Cloudinary-backed media upload |
| Feedback | `/api/feedback` | User feedback submissions |
| Managers / Admin | `/api/managers`, `/api/admin` | Developer-only account management |

Full request/response shapes, auth requirements, and rate limits are documented in [`docs/API.md`](docs/API.md).

</details>

---

## 🌐 Deployment

This project is designed to deploy as two pieces:

1. **Backend** → Render / Railway / Fly.io (Node host) + a managed Postgres instance (Neon / Supabase)
2. **Frontend** → Vercel / Netlify (static hosting for `dev-music-hub.html`)

Full step-by-step instructions, including environment variable setup and CORS configuration, are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 📚 Documentation

| Doc | Description |
|---|---|
| [`docs/API.md`](docs/API.md) | Complete API endpoint reference |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Production deployment walkthrough |
| [`docs/TEST_CHECKLIST.md`](docs/TEST_CHECKLIST.md) | Manual QA checklist by user role |
| [`docs/CHANGES.md`](docs/CHANGES.md) | What changed from the original prototype, and why |

---

## 🗺️ Roadmap

- [ ] Automated test suite
- [ ] Mobile-responsive UI polish
- [ ] Playlist sharing between users
- [ ] Admin analytics dashboard

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome — feel free to check the [issues page](https://github.com/kdev76979-mac/dev-music-hub/issues).

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

Made with ❤️ by [Dev Kushwah](https://github.com/kdev76979-mac)

</div>
