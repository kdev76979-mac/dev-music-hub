const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { addSongToCollectionSchema } = require('../utils/validate');
const { resolveSong, serializeSong } = require('../utils/songs');

const router = express.Router();

// Likes/history/My Music are personal-user features (not manager/developer
// admin tooling), so we require the account to be a regular User.
function requireUserKind(req, res, next) {
  if (!req.auth || req.auth.kind !== 'user') return res.status(403).json({ error: 'This feature is available to user accounts.' });
  next();
}

router.get(
  '/',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const likes = await prisma.like.findMany({ where: { userId: req.auth.id }, include: { song: true }, orderBy: { likedAt: 'desc' } });
    res.json({ items: likes.map((l) => serializeSong(l.song)) });
  })
);

router.post(
  '/',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const data = addSongToCollectionSchema.parse(req.body);
    const song = await resolveSong(data);
    await prisma.like.upsert({
      where: { userId_songId: { userId: req.auth.id, songId: song.id } },
      create: { userId: req.auth.id, songId: song.id },
      update: {},
    });
    res.status(201).json({ item: serializeSong(song) });
  })
);

router.delete(
  '/:songId',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    await prisma.like.deleteMany({ where: { userId: req.auth.id, songId: req.params.songId } });
    res.json({ ok: true });
  })
);

module.exports = router;
