require('dotenv').config();
const app = require('./app');

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill these in before starting the server.');
  process.exit(1);
}

const OPTIONAL_WARN = ['YOUTUBE_API_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
OPTIONAL_WARN.forEach((k) => {
  if (!process.env[k]) console.warn(`[warn] ${k} is not set — related features will return 503 until it is configured.`);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Dev Music Hub API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
