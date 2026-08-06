const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Verify JWT Token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_key_ai_forum_2026_secure'
    );

    // Support fixed Admin session
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aiforum.com').trim().toLowerCase();
    const decodedEmail = (decoded.email || '').trim().toLowerCase();

    if (decoded.role === 'admin' || decoded.id === 'admin_fixed_id' || (decodedEmail && decodedEmail === adminEmail)) {
      req.user = {
        _id: 'admin_fixed_id',
        id: 'admin_fixed_id',
        name: 'System Admin',
        email: decodedEmail || adminEmail,
        role: 'admin'
      };
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Authentication failed.'
    });
  }
};

// Role Authorization Middleware - Return 403 Forbidden for unauthorized roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Unauthorized role '${req.user ? req.user.role : 'guest'}' for this portal.`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
