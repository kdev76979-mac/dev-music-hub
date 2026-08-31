const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { deleteAsset } = require('../lib/cloudinary');

const router = express.Router();

const heroSchema = z
  .object({
    mediaType: z.enum(['YOUTUBE', 'PHOTO', 'VIDEO']),
    title: z.string().trim().max(200).optional(),
    artist: z.string().trim().max(200).optional(),
    caption: z.string().trim().max(300).optional(),
    img: z.string().trim().url().max(2000),
    youtubeVideoId: z.string().trim().max(50).optional(),
    mediaUrl: z.string().trim().url().max(2000).optional(),
    mediaPublicId: z.string().trim().max(300).optional(),
  })
  .refine((v) => (v.mediaType === 'YOUTUBE' ? !!v.youtubeVideoId : !!v.mediaUrl), {
    message: 'youtubeVideoId is required for YOUTUBE items, mediaUrl is required for PHOTO/VIDEO items.',
  });

function serialize(h) {
  return {
    id: h.id,
    title: h.title,
    artist: h.artist,
    caption: h.caption,
    img: h.img,
    mediaType: h.mediaType.toLowerCase(),
    videoId: h.youtubeVideoId || null,
    mediaUrl: h.mediaUrl || null,
    createdAt: h.createdAt,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await prisma.heroItem.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ items: items.map(serialize) });
  })
);

router.post(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const data = heroSchema.parse(req.body);
    const item = await prisma.heroItem.create({
      data: {
        mediaType: data.mediaType,
        title: data.title || null,
        artist: data.artist || null,
        caption: data.caption || null,
        img: data.img,
        youtubeVideoId: data.mediaType === 'YOUTUBE' ? data.youtubeVideoId : null,
        mediaUrl: data.mediaType !== 'YOUTUBE' ? data.mediaUrl : null,
        mediaPublicId: data.mediaPublicId || null,
      },
    });
    res.status(201).json({ item: serialize(item) });
  })
);

router.delete(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const item = await prisma.heroItem.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Hero item not found.' });
    if (item.mediaPublicId) {
      await deleteAsset(item.mediaPublicId, item.mediaType === 'VIDEO' ? 'video' : 'image');
    }
    await prisma.heroItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

router.post(
  '/bulk-delete',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'No ids provided.' });
    const items = await prisma.heroItem.findMany({ where: { id: { in: ids } } });
    await Promise.all(
      items.filter((h) => h.mediaPublicId).map((h) => deleteAsset(h.mediaPublicId, h.mediaType === 'VIDEO' ? 'video' : 'image'))
    );
    const result = await prisma.heroItem.deleteMany({ where: { id: { in: ids } } });
    res.json({ ok: true, deleted: result.count });
  })
);

module.exports = router;
