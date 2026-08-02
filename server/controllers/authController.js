const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validateEmailAddress } = require('../utils/emailValidator');

// Helper to generate JWT token
const generateToken = (id, role, email) => {
  return jwt.sign(
    { id, role, email },
    process.env.JWT_SECRET || 'super_secret_jwt_key_ai_forum_2026_secure',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @desc    Admin Login
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aiforum.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'jspm@2026';

    // Validate admin credentials
    if (cleanEmail === adminEmail && password === adminPassword) {
      const token = generateToken('admin_fixed_id', 'admin', adminEmail);
      return res.json({
        success: true,
        token,
        user: {
          id: 'admin_fixed_id',
          name: 'System Admin',
          email: adminEmail,
          role: 'admin'
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin Credentials.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        user: req.user
      });
    }

    res.status(404).json({ success: false, message: 'User not found' });
  } catch (error) {
    next(error);
  }
};
