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
    const sinceHours = req.query.sinceHours ? Number(req.query.sinceHours) : null;
    const where = { userId: req.auth.id };
    if (sinceHours) where.playedAt = { gte: new Date(Date.now() - sinceHours * 3600 * 1000) };
    const rows = await prisma.listeningHistory.findMany({
      where,
      include: { song: true },
      orderBy: { playedAt: 'desc' },
      take: 200,
    });
    res.json({ items: rows.map((r) => ({ ...serializeSong(r.song), playedAt: r.playedAt })) });
  })
);

router.post(
  '/',
  requireAuth,
  requireUserKind,
  asyncHandler(async (req, res) => {
    const data = addSongToCollectionSchema.parse(req.body);
    const song = await resolveSong(data);
    await prisma.listeningHistory.create({ data: { userId: req.auth.id, songId: song.id } });
    res.status(201).json({ ok: true });
  })
);

module.exports = router;
