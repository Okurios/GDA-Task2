const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'gda_sports_secret_key_2024';

/**
 * Middleware: verifies the JWT token from the Authorization header.
 * Attaches decoded user payload to req.user on success.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, fullname, role }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware: requires the authenticated user to have role = 'admin'.
 * Must be used AFTER verifyToken.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin, JWT_SECRET };
