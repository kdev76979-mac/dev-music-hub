const prisma = require('../lib/prisma');

/**
 * Resolves a song reference coming from the frontend, which may be either:
 *  - { songId } pointing at an existing Song, or
 *  - { song: { title, artist, img, youtubeVideoId } } describing a new pick
 *    (e.g. just chosen from YouTube search).
 *
 * When a youtubeVideoId is given and a Song with that ID already exists,
 * we reuse it instead of creating a duplicate (requirement: no duplicate
 * songs for the same YouTube video ID).
 */
async function resolveSong({ songId, song }) {
  if (songId) {
    const existing = await prisma.song.findUnique({ where: { id: songId } });
    if (!existing) {
      const err = new Error('That song no longer exists.');
      err.status = 404;
      throw err;
    }
    return existing;
  }

  if (song.youtubeVideoId) {
    const existing = await prisma.song.findUnique({ where: { youtubeVideoId: song.youtubeVideoId } });
    if (existing) return existing;
  }

  return prisma.song.create({
    data: {
      title: song.title,
      artist: song.artist,
      img: song.img || null,
      youtubeVideoId: song.youtubeVideoId || null,
    },
  });
}

function serializeSong(s) {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    img: s.img,
    videoId: s.youtubeVideoId || null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

module.exports = { resolveSong, serializeSong };
