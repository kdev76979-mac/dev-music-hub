const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { brandSchema, paginationSchema } = require('../utils/validate');
const { z } = require('zod');
const { deleteAsset } = require('../lib/cloudinary');

const router = express.Router();

// Manager/developer: read-only list of registered users.
router.get(
  '/users',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, q } = paginationSchema.parse(req.query);
    const where = q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { mobile: { contains: q } }] }
      : {};
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, mobile: true, avatarUrl: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  })
);

// Manager/developer: login log viewer.
router.get(
  '/login-logs',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const [items, total] = await Promise.all([
      prisma.loginLog.findMany({ skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
      prisma.loginLog.count(),
    ]);
    res.json({ items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
  })
);

// Public: the "About Developer" popup is visible to every visitor, so the
// current developer's photo needs to be readable without auth.
router.get(
  '/dev-photo',
  asyncHandler(async (req, res) => {
    const dev = await prisma.adminAccount.findFirst({ where: { role: 'DEVELOPER' }, select: { photoUrl: true } });
    res.json({ photoUrl: (dev && dev.photoUrl) || null });
  })
);

// Public: the developer's photo is shown in the "About Developer" popup to every visitor.
router.get(
  '/dev-photo',
  asyncHandler(async (req, res) => {
    const dev = await prisma.adminAccount.findFirst({ where: { role: 'DEVELOPER' } });
    res.json({ photoUrl: (dev && dev.photoUrl) || null });
  })
);

// Public: the "About the Developer" popup shows this photo to every visitor.
router.get(
  '/dev-photo',
  asyncHandler(async (req, res) => {
    const dev = await prisma.adminAccount.findFirst({ where: { role: 'DEVELOPER' } });
    res.json({ photoUrl: (dev && dev.photoUrl) || null });
  })
);

// Developer only: set developer profile photo URL (after uploading via /api/uploads/dev-photo).
router.patch(
  '/dev-photo',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const schema = z.object({ photoUrl: z.string().trim().url().max(2000).nullable(), publicId: z.string().trim().max(300).nullable().optional() });
    const { photoUrl, publicId } = schema.parse(req.body);
    const current = await prisma.adminAccount.findUnique({ where: { id: req.auth.id } });
    if (current && current.photoPublicId && current.photoPublicId !== publicId) {
      await deleteAsset(current.photoPublicId, 'image');
    }
    const admin = await prisma.adminAccount.update({
      where: { id: req.auth.id },
      data: { photoUrl, photoPublicId: publicId || null },
    });
    res.json({ photoUrl: admin.photoUrl });
  })
);

// Brand name — readable by everyone, editable by managers/developer.
router.get(
  '/brand',
  asyncHandler(async (req, res) => {
    const setting = await prisma.appSetting.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
    res.json({ brand: setting.brand });
  })
);

router.patch(
  '/brand',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const data = brandSchema.parse(req.body);
    const setting = await prisma.appSetting.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', brand: data.brand },
      update: { brand: data.brand },
    });
    res.json({ brand: setting.brand });
  })
);

module.exports = router;
