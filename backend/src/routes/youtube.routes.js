const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { youtubeLimiter } = require('../middleware/rateLimiters');
const { youtubeSearchQuerySchema } = require('../utils/validate');

const router = express.Router();

// Any authenticated account can search — regular users use this to add
// songs to their own "My Music", while managers/developers use it for
// hero items and catalog songs. Requiring auth (rather than opening it
// to the public) plus the per-window rate limit below is what protects
// the shared YouTube API quota from abuse.
router.get(
  '/search',
  requireAuth,
  youtubeLimiter,
  asyncHandler(async (req, res) => {
    const { q, maxResults } = youtubeSearchQuerySchema.parse(req.query);
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'YouTube search is not configured on the server yet.' });
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('maxResults', String(maxResults || 8));
    url.searchParams.set('q', q);
    url.searchParams.set('key', apiKey);

    let upstream;
    try {
      upstream = await fetch(url.toString());
    } catch (e) {
      return res.status(502).json({ error: 'Could not reach YouTube right now. Please try again.' });
    }

    if (upstream.status === 403) {
      // Most commonly a quota-exceeded response from the YouTube Data API.
      return res.status(503).json({ error: 'YouTube search is temporarily unavailable (API quota exceeded). Please try again later.' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: 'YouTube search failed. Please try again.' });
    }

    const data = await upstream.json();
    const results = (data.items || [])
      .filter((it) => it.id && it.id.videoId)
      .map((it) => ({
        videoId: it.id.videoId,
        title: it.snippet.title,
        channel: it.snippet.channelTitle,
        thumb: ((it.snippet.thumbnails && (it.snippet.thumbnails.medium || it.snippet.thumbnails.default)) || {}).url || '',
      }));
    res.json({ items: results });
  })
);

module.exports = router;
