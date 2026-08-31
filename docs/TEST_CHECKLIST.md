# Test Checklist — Dev Music Hub

Run through this after deploying (or locally against `npm run dev`).

## User flows
- [ ] Register a new account (name, email, mobile, password, optional avatar)
- [ ] Log out
- [ ] Log back in with email **or** mobile + password
- [ ] Edit profile (name, email, avatar via upload and via URL)
- [ ] Change password, then log out and log back in with the new password
- [ ] Like a song; unlike it
- [ ] Add a song to My Music (from a category/artist/playlist, and via YouTube search)
- [ ] Remove a song from My Music
- [ ] Play a song, confirm it's recorded in "Recently Listened"
- [ ] View listening history, filter by time range
- [ ] Submit feedback
- [ ] **Log in from a second browser (or incognito window) and confirm your
      likes, My Music, and profile follow you** — this is the core "real
      multi-user app" requirement.

## Manager flows
- [ ] Log in as a manager (Admin tab → Manager sub-tab)
- [ ] Add/remove a category, artist, playlist
- [ ] Add a song to a category/artist/playlist via YouTube search
- [ ] Try the bulk-add tool with a short list of song names
- [ ] View feedback list; mark one as Resolved; delete one
- [ ] Confirm the Developer-only tabs (Developer Photo, Manager Admin) are
      **not visible** in the dashboard nav

## Developer flows
- [ ] Log in as the developer
- [ ] Add a category, artist, playlist, and a YouTube song
- [ ] Search YouTube and add a result
- [ ] Add a hero item via YouTube search
- [ ] Upload a hero photo; upload a hero video; confirm the video plays in
      the hero video modal
- [ ] Upload/change/remove the developer profile photo; confirm it shows in
      "About Developer" for a signed-out visitor
- [ ] Add a manager; remove a manager
- [ ] Rename the brand (top-left title changes everywhere)
- [ ] Confirm a change made here (e.g. a new song) appears for a **different,
      already-open browser tab** after a refresh — proves shared DB state

## Security checks
- [ ] With dev tools open, confirm **no password, database URL, or YouTube
      API key** appears anywhere in the page source or network responses
- [ ] Log out, then try calling a protected endpoint directly (e.g.
      `fetch('/api/categories', {method:'POST', ...})` from the console) —
      expect `401`
- [ ] Log in as a plain user, try calling a manager-only endpoint (e.g.
      `POST /api/categories`) — expect `403`
- [ ] Log in as a manager, try calling a developer-only endpoint (e.g.
      `POST /api/managers`) — expect `403`
- [ ] Confirm passwords are hashed: query the database directly and check
      `passwordHash` is an Argon2 string, never plaintext
- [ ] Confirm `.env` is not present in the deployed repo/build output
- [ ] Try registering two accounts with the same email — expect a clear
      "already in use" error, not a silent duplicate
- [ ] Try adding the same YouTube video ID as a song twice — confirm it
      reuses the existing song instead of creating a duplicate
- [ ] Submit feedback rapidly more than 10 times in an hour — expect a
      rate-limit error
- [ ] Attempt 20+ failed logins in 15 minutes — expect a rate-limit error

## Resilience checks
- [ ] Turn off network mid-action (e.g. while liking a song) — confirm a
      clear error/toast appears and the UI doesn't get stuck or duplicate
      the action on retry
- [ ] Stop the backend temporarily and reload the frontend — confirm a
      friendly "could not load" message instead of a blank/broken page
- [ ] Try a hero video upload larger than 250MB — expect a clear "too large"
      error, not a crash
- [ ] Try uploading a non-image file as an avatar — expect a clear
      "unsupported file type" error
