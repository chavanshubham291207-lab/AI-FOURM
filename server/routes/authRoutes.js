const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const {
  registerStudent,
  registerVoter,
  login,
  getMe,
  updateProfile
} = require('../controllers/authController');
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

// Student Registration Route
router.post(
  '/register-student',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('name').notEmpty().withMessage('Name is required.'),
    body('rollNumber').notEmpty().withMessage('Roll number is required.'),
    body('department').notEmpty().withMessage('Department is required.'),
    handleValidationErrors
  ],
  registerStudent
);

// Voter Registration Route
router.post(
  '/register-voter',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
    body('name').notEmpty().withMessage('Name is required.'),
    handleValidationErrors
  ],
  registerVoter
);

// Unified Login Route
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
router.put('/update-profile', protect, updateProfile);

module.exports = router;
