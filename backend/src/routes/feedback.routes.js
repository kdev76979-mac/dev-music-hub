const express = require('express');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth, requireRole } = require('../middleware/auth');
const { feedbackLimiter } = require('../middleware/rateLimiters');
const { feedbackSchema, feedbackStatusSchema } = require('../utils/validate');

const router = express.Router();

function serialize(f) {
  return { id: f.id, name: f.name, email: f.email, message: f.message, status: f.status, createdAt: f.createdAt };
}

// Only authenticated users can submit feedback (per spec item 7).
router.post(
  '/',
  requireAuth,
  feedbackLimiter,
  asyncHandler(async (req, res) => {
    const data = feedbackSchema.parse(req.body);
    let name = 'User';
    let email = null;
    let userId = null;
    if (req.auth.kind === 'user') {
      const u = await prisma.user.findUnique({ where: { id: req.auth.id } });
      if (u) {
        name = u.name;
        email = u.email;
        userId = u.id;
      }
    } else {
      const a = await prisma.adminAccount.findUnique({ where: { id: req.auth.id } });
      if (a) {
        name = a.name;
        email = a.email;
      }
    }
    const feedback = await prisma.feedback.create({ data: { name, email, message: data.message, userId } });
    res.status(201).json({ item: serialize(feedback) });
  })
);

// Manager/developer only, per spec.
router.get(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const items = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ items: items.map(serialize) });
  })
);

router.patch(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const data = feedbackStatusSchema.parse(req.body);
    const item = await prisma.feedback.update({ where: { id: req.params.id }, data: { status: data.status } });
    res.json({ item: serialize(item) });
  })
);

router.delete(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    await prisma.feedback.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

module.exports = router;
