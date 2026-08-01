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

// @desc    Register Student
// @route   POST /api/auth/register-student
// @access  Public
exports.registerStudent = async (req, res, next) => {
  try {
    const { name, email, password, rollNumber, department, branch } = req.body;

    if (!name || !email || !password || !rollNumber || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // 1. Email Format & Demo/Disposable Validation
    const emailCheck = validateEmailAddress(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message
      });
    }

    const cleanEmail = emailCheck.cleanEmail;

    // 2. Database Validation: Check if email already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // 3. Create Student User (Password hashed by User schema pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'student',
      rollNumber: rollNumber.trim(),
      department: department.trim(),
      branch: branch ? branch.trim() : department.trim()
    });

    const token = generateToken(user._id, user.role, user.email);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        branch: user.branch
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register Voter
// @route   POST /api/auth/register-voter
// @access  Public
exports.registerVoter = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // 1. Email Format & Demo/Disposable Validation
    const emailCheck = validateEmailAddress(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message
      });
    }

    const cleanEmail = emailCheck.cleanEmail;

    // 2. Database Validation: Check if email already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.'
      });
    }

    // 3. Create Voter User (Password hashed by User schema pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: 'voter'
    });

    const token = generateToken(user._id, user.role, user.email);

    res.status(201).json({
      success: true,
      message: 'Voter registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unified Login with Strict Role Validation
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, targetPortal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Basic format check
    const emailCheck = validateEmailAddress(cleanEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message
      });
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aiforum.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'jspm@2026';

    // ===================================
    // 1. ADMIN LOGIN FLOW (ENV CREDENTIALS ONLY)
    // ===================================
    if (targetPortal === 'admin' || cleanEmail === adminEmail) {
      // Validate fixed admin credentials
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
    }

    // ===================================
    // 2. STUDENT & VOTER LOGIN FLOW
    // ===================================
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // STRICT ROLE VALIDATION & MESSAGING
    if (targetPortal === 'voter' && user.role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'This email is registered as a Student. Please login through the Student Portal.'
      });
    }

    if (targetPortal === 'student' && user.role === 'voter') {
      return res.status(403).json({
        success: false,
        message: 'This email is registered as a Voter. Please login through the Voting Portal.'
      });
    }

    if (targetPortal && user.role !== targetPortal) {
      return res.status(403).json({
        success: false,
        message: `This email is registered for another portal. Please login through the correct dashboard.`
      });
    }

    // Compare hashed password for student/voter using bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        branch: user.branch
      }
    });
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

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        branch: user.branch,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin credentials are managed via environment configuration'
      });
    }

    const { name, rollNumber, department, branch } = req.body;
    const fieldsToUpdate = {};

    if (name) fieldsToUpdate.name = name.trim();
    if (rollNumber) fieldsToUpdate.rollNumber = rollNumber.trim();
    if (department) fieldsToUpdate.department = department.trim();
    if (branch) fieldsToUpdate.branch = branch.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        rollNumber: updatedUser.rollNumber,
        department: updatedUser.department,
        branch: updatedUser.branch
      }
    });
  } catch (error) {
    next(error);
  }
};
