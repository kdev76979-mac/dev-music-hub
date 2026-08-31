const rateLimit = require('express-rate-limit');

// Brute-force protection on login/register endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

// Feedback spam protection.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You have submitted too much feedback recently. Please try again later.' },
});

// Protect YouTube API quota — this is shared across all users of the app.
const youtubeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many searches right now. Please wait a moment and try again.' },
});

// Upload endpoints — expensive, so keep tighter than general API traffic.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads recently. Please wait a bit and try again.' },
});

// General-purpose API limiter applied to everything, as defense in depth.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, feedbackLimiter, youtubeLimiter, uploadLimiter, generalLimiter };
