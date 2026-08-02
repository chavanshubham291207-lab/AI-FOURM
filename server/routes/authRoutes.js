const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Middleware to handle express-validator validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({
      success: false,
      message: firstError
    });
  }
  next();
};

// Admin Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('password').notEmpty().withMessage('Password is required.'),
    handleValidationErrors
  ],
  login
);

router.get('/me', protect, getMe);

module.exports = router;
