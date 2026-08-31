const express = require('express');
const argon2 = require('argon2');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
} = require('../utils/jwt');
const {
  registerUserSchema,
  loginUserSchema,
  adminLoginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../utils/validate');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, kind: 'user', role: 'user', name: u.name, email: u.email, mobile: u.mobile, avatarUrl: u.avatarUrl || '' };
}
function publicAdmin(a) {
  return { id: a.id, kind: 'admin', role: a.role.toLowerCase(), name: a.name, email: a.email, mobile: a.mobile || '', avatarUrl: a.photoUrl || '' };
}

async function logLogin({ who, role, success, userId, adminId, req }) {
  try {
    await prisma.loginLog.create({
      data: {
        who,
        role,
        success,
        userId: userId || null,
        adminId: adminId || null,
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch (e) {
    console.error('Failed to write login log:', e.message);
  }
}

function issueSession(res, { id, role, kind }) {
  const accessToken = signAccessToken({ sub: id, role, kind });
  const refreshToken = signRefreshToken({ sub: id, role, kind });
  res.cookie('dmh_access', accessToken, accessCookieOptions());
  res.cookie('dmh_refresh', refreshToken, refreshCookieOptions());
}

/* ---------------------------- USER REGISTER ---------------------------- */
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerUserSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email.toLowerCase() }, { mobile: data.mobile }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email or mobile number already exists. Try logging in instead.' });
    }
    const passwordHash = await argon2.hash(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        passwordHash,
        avatarUrl: data.avatarUrl || null,
      },
    });
    issueSession(res, { id: user.id, role: 'user', kind: 'user' });
    await logLogin({ who: user.email, role: 'user', success: true, userId: user.id, req });
    res.status(201).json({ user: publicUser(user) });
  })
);

/* ------------------------------ USER LOGIN ------------------------------ */
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = loginUserSchema.parse(req.body);
    const idf = data.identifier.toLowerCase();
    const user = await prisma.user.findFirst({ where: { OR: [{ email: idf }, { mobile: data.identifier.trim() }] } });
    const ok = user ? await argon2.verify(user.passwordHash, data.password) : false;
    if (!ok) {
      await logLogin({ who: data.identifier, role: 'user', success: false, req });
      return res.status(401).json({ error: 'Invalid email/mobile or password.' });
    }
    issueSession(res, { id: user.id, role: 'user', kind: 'user' });
    await logLogin({ who: user.email, role: 'user', success: true, userId: user.id, req });
    res.json({ user: publicUser(user) });
  })
);

/* -------------------------- ADMIN (MANAGER/DEV) LOGIN -------------------------- */
router.post(
  '/admin/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = adminLoginSchema.parse(req.body);
    const idf = data.identifier.toLowerCase();
    const admin = await prisma.adminAccount.findFirst({ where: { OR: [{ email: idf }, { mobile: data.identifier.trim() }] } });
    const ok = admin ? await argon2.verify(admin.passwordHash, data.password) : false;
    if (!ok) {
      await logLogin({ who: data.identifier, role: 'admin', success: false, req });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const role = admin.role.toLowerCase(); // 'manager' | 'developer'
    issueSession(res, { id: admin.id, role, kind: 'admin' });
    await logLogin({ who: admin.email, role, success: true, adminId: admin.id, req });
    res.json({ user: publicAdmin(admin) });
  })
);

/* -------------------------------- REFRESH -------------------------------- */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies && req.cookies.dmh_refresh;
    if (!token) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (e) {
      res.clearCookie('dmh_access', accessCookieOptions());
      res.clearCookie('dmh_refresh', refreshCookieOptions());
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    // Confirm the account still exists (e.g. wasn't deleted since the token was issued).
    let account = null;
    if (payload.kind === 'user') account = await prisma.user.findUnique({ where: { id: payload.sub } });
    else account = await prisma.adminAccount.findUnique({ where: { id: payload.sub } });
    if (!account) {
      res.clearCookie('dmh_access', accessCookieOptions());
      res.clearCookie('dmh_refresh', refreshCookieOptions());
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    issueSession(res, { id: payload.sub, role: payload.role, kind: payload.kind });
    res.json({ ok: true });
  })
);

/* -------------------------------- LOGOUT -------------------------------- */
router.post('/logout', (req, res) => {
  res.clearCookie('dmh_access', accessCookieOptions());
  res.clearCookie('dmh_refresh', refreshCookieOptions());
  res.json({ ok: true });
});

/* ---------------------------------- ME ---------------------------------- */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth.kind === 'user') {
      const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
      if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
      return res.json({ user: publicUser(user) });
    }
    const admin = await prisma.adminAccount.findUnique({ where: { id: req.auth.id } });
    if (!admin) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: publicAdmin(admin) });
  })
);

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    if (req.auth.kind === 'user') {
      if (data.email) {
        const clash = await prisma.user.findFirst({ where: { email: data.email.toLowerCase(), NOT: { id: req.auth.id } } });
        if (clash) return res.status(409).json({ error: 'That email is already in use.' });
      }
      const user = await prisma.user.update({
        where: { id: req.auth.id },
        data: {
          name: data.name,
          email: data.email ? data.email.toLowerCase() : undefined,
          avatarUrl: data.avatarUrl === '' ? null : data.avatarUrl,
        },
      });
      return res.json({ user: publicUser(user) });
    }
    // Manager/developer profile edit (name/photo only here; photo upload has its own route).
    const admin = await prisma.adminAccount.update({
      where: { id: req.auth.id },
      data: { name: data.name },
    });
    res.json({ user: publicAdmin(admin) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = changePasswordSchema.parse(req.body);
    const model = req.auth.kind === 'user' ? prisma.user : prisma.adminAccount;
    const account = await model.findUnique({ where: { id: req.auth.id } });
    if (!account) return res.status(401).json({ error: 'Account no longer exists.' });
    const ok = await argon2.verify(account.passwordHash, data.currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
    const passwordHash = await argon2.hash(data.newPassword);
    await model.update({ where: { id: req.auth.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

module.exports = router;
