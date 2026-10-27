const mongoose = require('mongoose');
const User = require('../models/User');
const { verifyToken } = require('../utils/authTokens');

/**
 * Middleware to authenticate requests using cryptographically signed session tokens.
 * Rejects raw user IDs to prevent user impersonation.
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Allow server-side administrative access ONLY for administrative management routes.
    // Disallow x-admin-secret from bypassing ordinary user-facing endpoints (e.g. /api/auth/me, /api/exams).
    const isUserFacingRoute = req.baseUrl === '/api/auth' || req.baseUrl === '/api/exams';
    const configuredSecret = process.env.ADMIN_SECRET || process.env.ADMIN_KEY;
    const adminSecret = req.headers['x-admin-secret'];

    if (!isUserFacingRoute && configuredSecret && adminSecret && adminSecret.trim() === configuredSecret.trim()) {
      req.user = {
        _id: 'admin_system',
        id: 'admin_system',
        name: 'System Administrator',
        role: 'library_admin'
      };
      return next();
    }

    // 2. Extract Bearer token or x-auth-token from request headers
    const authHeader = req.headers['authorization'];
    let token = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = String(req.headers['x-auth-token']).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No authorization token provided.'
      });
    }

    // 3. Cryptographically verify signature and expiration
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid, tampered, or expired authorization token. Please sign in again.'
      });
    }

    // 4. Verify user exists in the database
    let user = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(decoded.id)) {
      user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authenticated account not found or has been removed.'
        });
      }
    } else {
      // In unit test environments or disconnected states, use the verified claims
      user = {
        _id: decoded.id,
        id: decoded.id,
        name: decoded.name || 'Authenticated User',
        email: decoded.email,
        role: decoded.role || 'student',
        department: decoded.department || ''
      };
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

/**
 * Middleware to restrict access to specific roles on the server.
 * Never trusts client-side storage or user-submitted role claims.
 * @param  {...string} roles Allowed roles ('student', 'faculty', 'library_admin', 'admin')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const currentRole = (req.user.role || '').toLowerCase();
    const isAllowed = roles.some(role => {
      const r = role.toLowerCase();
      if (r === 'admin' || r === 'library_admin') {
        return currentRole === 'admin' || currentRole === 'library_admin';
      }
      return currentRole === r;
    });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This operation requires one of the following roles: ${roles.join(', ')}.`
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole
};
