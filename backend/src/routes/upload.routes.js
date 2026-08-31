const express = require('express');
const multer = require('multer');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole, requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const {
  uploadBuffer,
  isCloudinaryConfigured,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
} = require('../lib/cloudinary');

const router = express.Router();

// Memory storage: we stream straight to Cloudinary, never touch local disk,
// so nothing large or untrusted ever gets written to the server's filesystem.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(new Error('Unsupported image type. Use JPG, PNG, or WEBP.'));
    cb(null, true);
  },
});
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_VIDEO_MIME.includes(file.mimetype)) return cb(new Error('Unsupported video type. Use MP4, WEBM, or MOV.'));
    cb(null, true);
  },
});

function guard(req, res, next) {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ error: 'Media storage is not configured on the server yet (missing Cloudinary credentials).' });
  }
  next();
}

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large.' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });
  next();
}

// Any authenticated user can upload their own avatar.
router.post(
  '/avatar',
  requireAuth,
  uploadLimiter,
  guard,
  imageUpload.single('file'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'dev-music-hub/avatars', resourceType: 'image', filenameHint: req.auth.id });
    res.status(201).json({ url: result.url, publicId: result.publicId });
  })
);

// Manager/developer: hero photo.
router.post(
  '/hero-photo',
  requireRole('manager'),
  uploadLimiter,
  guard,
  imageUpload.single('file'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'dev-music-hub/hero', resourceType: 'image', filenameHint: 'hero_photo' });
    res.status(201).json({ url: result.url, publicId: result.publicId });
  })
);

// Manager/developer: hero video (Cloudinary auto-generates a poster thumbnail).
router.post(
  '/hero-video',
  requireRole('manager'),
  uploadLimiter,
  guard,
  videoUpload.single('file'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'dev-music-hub/hero', resourceType: 'video', filenameHint: 'hero_video' });
    // Cloudinary can derive a jpg poster frame from the uploaded video by swapping the extension.
    const poster = result.url.replace(/\.[a-zA-Z0-9]+$/, '.jpg');
    res.status(201).json({ url: result.url, publicId: result.publicId, poster });
  })
);

// Developer only: developer profile photo.
router.post(
  '/dev-photo',
  requireRole('developer'),
  uploadLimiter,
  guard,
  imageUpload.single('file'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'dev-music-hub/dev-photo', resourceType: 'image', filenameHint: 'developer' });
    res.status(201).json({ url: result.url, publicId: result.publicId });
  })
);

// Manager/developer: generic cover image for a category/artist/playlist.
router.post(
  '/cover',
  requireRole('manager'),
  uploadLimiter,
  guard,
  imageUpload.single('file'),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided.' });
    const result = await uploadBuffer(req.file.buffer, { folder: 'dev-music-hub/covers', resourceType: 'image', filenameHint: 'cover' });
    res.status(201).json({ url: result.url, publicId: result.publicId });
  })
);

module.exports = router;
