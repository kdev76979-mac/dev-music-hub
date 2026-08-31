const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { attachAuth } = require('./middleware/auth');
const { generalLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const songsRoutes = require('./routes/songs.routes');
const categoriesRoutes = require('./routes/categories.routes');
const artistsRoutes = require('./routes/artists.routes');
const playlistsRoutes = require('./routes/playlists.routes');
const heroRoutes = require('./routes/hero.routes');
const likesRoutes = require('./routes/likes.routes');
const historyRoutes = require('./routes/history.routes');
const mymusicRoutes = require('./routes/mymusic.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const managersRoutes = require('./routes/managers.routes');
const adminRoutes = require('./routes/admin.routes');
const youtubeRoutes = require('./routes/youtube.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// Trust the first proxy (Render/Railway/Fly all sit behind one) so
// req.ip and secure-cookie detection behave correctly.
app.set('trust proxy', 1);

app.use(
  helmet({
    // The frontend is served as a single self-contained HTML file with an
    // inline <script> and images pulled from several external hosts
    // (Cloudinary, YouTube, avatar/demo image providers). A strict default
    // CSP would block the inline script and those images, so it's disabled
    // here; the other Helmet protections (X-Content-Type-Options, etc.)
    // still apply. If you split the frontend into external files behind a
    // CDN, turn this back on with a proper nonce-based policy.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
      // Allow same-origin/non-browser requests (no Origin header) and any explicitly configured origin.
      if (!origin || allowed.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);
app.use(attachAuth);

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/mymusic', mymusicRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/feedback', feedbackRoutes); // same handlers, matches spec's documented admin path
app.use('/api/managers', managersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/uploads', uploadRoutes);

app.use('/api', notFoundHandler); // unknown /api/* routes get a clean 404 JSON, not the frontend HTML

// ---------------------------------------------------------------------
// Serve the frontend as part of the same app, so the whole site — the
// pages users browse AND the API they call — lives behind one URL and
// one deployment. `public/index.html` is the built frontend.
// ---------------------------------------------------------------------
const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use(errorHandler);

module.exports = app;
