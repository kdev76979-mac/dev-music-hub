const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { songSchema, paginationSchema } = require('../utils/validate');
const { serializeSong } = require('../utils/songs');

const router = express.Router();

// Paginated, searchable song list — avoids loading thousands of songs at once.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = paginationSchema.parse(req.query);
    const where = q
      ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { artist: { contains: q, mode: 'insensitive' } }] }
      : {};
    const [items, total] = await Promise.all([
      prisma.song.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.song.count({ where }),
    ]);
    res.json({ items: items.map(serializeSong), page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const song = await prisma.song.findUnique({ where: { id: req.params.id } });
    if (!song) return res.status(404).json({ error: 'Song not found.' });
    res.json({ item: serializeSong(song) });
  })
);

router.post(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const data = songSchema.parse(req.body);
    if (data.youtubeVideoId) {
      const existing = await prisma.song.findUnique({ where: { youtubeVideoId: data.youtubeVideoId } });
      if (existing) return res.status(200).json({ item: serializeSong(existing), deduped: true });
    }
    const song = await prisma.song.create({
      data: { title: data.title, artist: data.artist, img: data.img || null, youtubeVideoId: data.youtubeVideoId || null },
    });
    res.status(201).json({ item: serializeSong(song) });
  })
);

router.patch(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const data = songSchema.partial().parse(req.body);
    const song = await prisma.song.update({ where: { id: req.params.id }, data });
    res.json({ item: serializeSong(song) });
  })
);

router.delete(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    await prisma.song.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;
