// Session gate. Verifies the JWT session cookie, loads the user, and attaches
// `req.user` (with `user_id` for downstream consumers like 0XC-100). Returns a
// 401 `{ success, error }` when the cookie is missing/invalid or the user no
// longer exists. Mounted on every API router EXCEPT the public file-serving GET.
//
// A factory over the store, so server.js builds it once from the single shared
// store and passes it to every router, and tests inject an in-memory store.
const { verifySession, SESSION_COOKIE } = require('../services/authService');

function createRequireAuth(store) {
  const unauthorized = (res) =>
    res.status(401).json({ success: false, error: 'Authentication required' });

  return async function requireAuth(req, res, next) {
    const token = req.cookies?.[SESSION_COOKIE];
    const payload = verifySession(token);
    if (!payload) {
      return unauthorized(res);
    }

    try {
      const user = await store.findUserById(payload.sub);
      if (!user) {
        return unauthorized(res);
      }
      req.user = {
        user_id: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        max_storage_bytes: user.max_storage_bytes,
      };
      next();
    } catch (err) {
      console.error('❌ Auth middleware error:', err.message);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };
}

module.exports = { createRequireAuth };
