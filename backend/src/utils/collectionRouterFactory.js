const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { nameImgSchema, addSongToCollectionSchema } = require('./validate');
const { resolveSong, serializeSong } = require('./songs');

/**
 * Builds a full CRUD router for a "named collection of songs" resource —
 * Category, Artist, and Playlist all share this exact shape (id, name,
 * img, many-to-many songs via a join table), so one implementation backs
 * all three instead of three near-identical copies.
 *
 * @param {object} opts
 * @param {string} opts.singular - 'category' | 'artist' | 'playlist'
 * @param {import('@prisma/client').PrismaClient[keyof PrismaClient]} opts.model - e.g. prisma.category
 * @param {Function} opts.joinDelegate - (prisma) => join table delegate, e.g. prisma.categorySong
 * @param {string} opts.joinFk - the FK column name on the join table, e.g. 'categoryId'
 */
function buildCollectionRouter({ singular, model, joinDelegate, joinFk }) {
  const router = express.Router();

  function serializeItem(item) {
    return {
      id: item.id,
      name: item.name,
      img: item.img,
      songs: (item.songs || []).map((rel) => serializeSong(rel.song)),
    };
  }

  const includeSongs = { songs: { include: { song: true }, orderBy: { addedAt: 'asc' } } };

  // Public: browse. Every logged-in-or-not user needs to see the shared catalog.
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const items = await model.findMany({ include: includeSongs, orderBy: { createdAt: 'asc' } });
      res.json({ items: items.map(serializeItem) });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await model.findUnique({ where: { id: req.params.id }, include: includeSongs });
      if (!item) return res.status(404).json({ error: `${singular} not found.` });
      res.json({ item: serializeItem(item) });
    })
  );

  // Manager or developer only, from here down — never trust frontend role checks.
  router.post(
    '/',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const data = nameImgSchema.parse(req.body);
      const item = await model.create({ data: { name: data.name, img: data.img || null } });
      res.status(201).json({ item: serializeItem({ ...item, songs: [] }) });
    })
  );

  router.patch(
    '/:id',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const data = nameImgSchema.partial().parse(req.body);
      const item = await model.update({ where: { id: req.params.id }, data, include: includeSongs });
      res.json({ item: serializeItem(item) });
    })
  );

  router.delete(
    '/:id',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      await model.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    })
  );

  // Bulk delete — mirrors the "select all / delete selected" UI already in the app.
  router.post(
    '/bulk-delete',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const ids = Array.isArray(req.body.ids) ? req.body.ids.filter((x) => typeof x === 'string') : [];
      if (!ids.length) return res.status(400).json({ error: 'No ids provided.' });
      const result = await model.deleteMany({ where: { id: { in: ids } } });
      res.json({ ok: true, deleted: result.count });
    })
  );

  // Attach a song — either an existing songId, or a fresh { song: {...} } payload
  // (e.g. straight from a YouTube search pick). Dedupes by youtubeVideoId.
  router.post(
    `/:id/songs`,
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const parent = await model.findUnique({ where: { id: req.params.id } });
      if (!parent) return res.status(404).json({ error: `${singular} not found.` });
      const data = addSongToCollectionSchema.parse(req.body);
      const song = await resolveSong(data);
      await joinDelegate(prisma).upsert({
        where: { [`${joinFk}_songId`]: { [joinFk]: parent.id, songId: song.id } },
        create: { [joinFk]: parent.id, songId: song.id },
        update: {},
      });
      const fresh = await model.findUnique({ where: { id: parent.id }, include: includeSongs });
      res.status(201).json({ item: serializeItem(fresh) });
    })
  );

  router.delete(
    '/:id/songs/:songId',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      await joinDelegate(prisma).delete({
        where: { [`${joinFk}_songId`]: { [joinFk]: req.params.id, songId: req.params.songId } },
      });
      res.json({ ok: true });
    })
  );

  router.post(
    '/:id/songs/bulk-delete',
    requireRole('manager'),
    asyncHandler(async (req, res) => {
      const songIds = Array.isArray(req.body.songIds) ? req.body.songIds : [];
      if (!songIds.length) return res.status(400).json({ error: 'No songIds provided.' });
      const result = await joinDelegate(prisma).deleteMany({ where: { [joinFk]: req.params.id, songId: { in: songIds } } });
      res.json({ ok: true, deleted: result.count });
    })
  );

  return router;
}

module.exports = { buildCollectionRouter };
