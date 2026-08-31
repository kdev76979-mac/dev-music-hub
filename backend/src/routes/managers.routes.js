const express = require('express');
const argon2 = require('argon2');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireRole } = require('../middleware/auth');
const { createManagerSchema } = require('../utils/validate');

const router = express.Router();

function serialize(m) {
  return { id: m.id, name: m.name, email: m.email, mobile: m.mobile, role: m.role.toLowerCase(), createdAt: m.createdAt };
}

// Everything here is developer-only: managers cannot manage other managers.
router.get(
  '/',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const managers = await prisma.adminAccount.findMany({ where: { role: 'MANAGER' }, orderBy: { createdAt: 'desc' } });
    res.json({ items: managers.map(serialize) });
  })
);

router.post(
  '/',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const data = createManagerSchema.parse(req.body);
    const clash = await prisma.adminAccount.findFirst({
      where: { OR: [{ email: data.email.toLowerCase() }, data.mobile ? { mobile: data.mobile } : undefined].filter(Boolean) },
    });
    if (clash) return res.status(409).json({ error: 'An account with that email or mobile already exists.' });
    const passwordHash = await argon2.hash(data.password);
    const manager = await prisma.adminAccount.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        mobile: data.mobile || null,
        passwordHash,
        role: 'MANAGER',
        createdById: req.auth.id,
      },
    });
    res.status(201).json({ item: serialize(manager) });
  })
);

router.delete(
  '/:id',
  requireRole('developer'),
  asyncHandler(async (req, res) => {
    const target = await prisma.adminAccount.findUnique({ where: { id: req.params.id } });
    if (!target || target.role !== 'MANAGER') return res.status(404).json({ error: 'Manager not found.' });
    await prisma.adminAccount.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;
