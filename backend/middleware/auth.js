const mongoose = require('mongoose');
const User = require('../models/User');
const { verifyToken } = require('../utils/authTokens');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = null;

    if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
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

    const decoded = verifyToken(token);
    if (!decoded || typeof decoded.id !== 'string' || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid, tampered, or expired authorization token. Please sign in again.'
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Authentication service is currently unavailable.'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated account not found or has been removed.'
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    const currentRole = String(req.user.role || '').toLowerCase();
    const isAllowed = roles.some(role => currentRole === String(role).toLowerCase());

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This operation requires one of the following roles: ${roles.join(', ')}.`
      });
    }

    return next();
  };
};

module.exports = {
  authenticate,
  requireRole
};
