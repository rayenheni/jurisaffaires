const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jurisaffaires-jwt-secret-2026';

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try { out[k] = decodeURIComponent(v); } catch (e) { out[k] = v; }
    }
  }
  return out;
}

function extractCandidates(req) {
  const candidates = [];
  const xToken = req.headers['x-admin-token'];
  if (xToken && typeof xToken === 'string') candidates.push(xToken.trim());

  const cookies = parseCookies(req.headers.cookie);
  if (cookies.ja_token) candidates.push(cookies.ja_token.trim());

  if (req.query && typeof req.query._token === 'string' && req.query._token.trim()) {
    candidates.push(req.query._token.trim());
  }

  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    const bearer = h.slice(7).trim();
    if (bearer) candidates.push(bearer);
  }
  return candidates;
}

function auth(required = true) {
  return (req, res, next) => {
    const candidates = extractCandidates(req);
    if (!candidates.length) {
      if (!required) return next();
      return res.status(401).json({
        error: 'Non authentifié — connectez-vous.',
        code: 'JA_AUTH_INVALID'
      });
    }

    for (const candidate of candidates) {
      try {
        const payload = jwt.verify(candidate, JWT_SECRET);
        req.user = payload;
        return next();
      } catch (e) {
        // Continue checking remaining candidate sources (e.g. if an upstream
        // proxy injected its own Authorization header alongside X-Admin-Token).
      }
    }

    if (!required) return next();
    return res.status(401).json({
      error: 'Session expirée — reconnectez-vous.',
      code: 'JA_AUTH_INVALID'
    });
  };
}

module.exports = auth;
