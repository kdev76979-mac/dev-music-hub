const cloudinary = require('cloudinary').v2;

// CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name> is picked up
// automatically from the environment by the SDK. We also support the
// three discrete vars for clarity in .env.example.
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // 250MB
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];

function isCloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

/**
 * Uploads a buffer to Cloudinary in a folder scoped by purpose, e.g.
 * 'dev-music-hub/hero', 'dev-music-hub/avatars', 'dev-music-hub/dev-photo'.
 * Returns { url, publicId, resourceType }.
 */
function uploadBuffer(buffer, { folder, resourceType = 'image', filenameHint = 'upload' }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${filenameHint}_${Date.now()}`,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type });
      }
    );
    stream.end(buffer);
  });
}

async function deleteAsset(publicId, resourceType = 'image') {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    // Non-fatal: an orphaned remote file is a cost/cleanup issue, not a
    // correctness issue for the app, so we log and move on.
    console.error('Cloudinary delete failed for', publicId, e.message);
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBuffer,
  deleteAsset,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  ALLOWED_IMAGE_MIME,
  ALLOWED_VIDEO_MIME,
};
