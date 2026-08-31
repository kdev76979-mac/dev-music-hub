const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { addSongToCollectionSchema } = require('../utils/validate');
const { resolveSong, serializeSong } = require('../utils/songs');

const router = express.Router();

function requireUserKind(req, res, next) {
  if (!req.auth || req.auth.kind !== 'user') return res.status(403).json({ error: 'This feature is available to user accounts.' });
  next();
}

router.get(
  '/',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const rows = await prisma.myMusic.findMany({ where: { userId: req.auth.id }, include: { song: true }, orderBy: { addedAt: 'desc' } });
    res.json({ items: rows.map((r) => serializeSong(r.song)) });
  })
);

router.post(
  '/',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const data = addSongToCollectionSchema.parse(req.body);
    const song = await resolveSong(data);
    await prisma.myMusic.upsert({
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
    await prisma.myMusic.deleteMany({ where: { userId: req.auth.id, songId: req.params.songId } });
    res.json({ ok: true });
  })
);

router.post(
  '/bulk-delete',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const songIds = Array.isArray(req.body.songIds) ? req.body.songIds : [];
    if (!songIds.length) return res.status(400).json({ error: 'No songIds provided.' });
    const result = await prisma.myMusic.deleteMany({ where: { userId: req.auth.id, songId: { in: songIds } } });
    res.json({ ok: true, deleted: result.count });
  })
);

module.exports = router;
