const { verifyAccessToken } = require('../utils/jwt');

/**
 * Populates req.auth = { id, role, kind } if a valid access token cookie is
 * present. Never throws — routes that require auth use requireAuth() /
 * requireRole() below. This lets public endpoints optionally personalize
 * (e.g. "is this song liked by the current user") without forcing login.
 */
function attachAuth(req, res, next) {
  const token = req.cookies && req.cookies.dmh_access;
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.auth = { id: payload.sub, role: payload.role, kind: payload.kind };
  } catch (e) {
    // expired/invalid access token — frontend should call /api/auth/refresh
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Not authenticated. Please log in.' });
  next();
}

/**
 * Role hierarchy for this app: developer > manager > user.
 * requireRole('manager') allows both manager and developer through.
 * requireRole('developer') allows only developer.
 * requireRole('user') just requires any authenticated account.
 *
 * IMPORTANT: this is the only place authorization is enforced. The
 * frontend's isAdmin()/isDeveloper() checks are for UI convenience only —
 * every protected route below re-checks role server-side.
 */
function requireRole(minRole) {
  const order = { user: 0, manager: 1, developer: 2 };
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    const have = order[req.auth.role];
    const need = order[minRole];
    if (have === undefined || need === undefined || have < need) {
      return res.status(403).json({ error: 'Forbidden — you do not have permission to do this.' });
    }
    next();
  };
}

module.exports = { attachAuth, requireAuth, requireRole };
