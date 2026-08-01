const express = require('express');
const router = express.Router();
const { handleChat, getConversationHistory } = require('../controllers/aiController');
const jwt = require('jsonwebtoken');

// Optional auth middleware so user ID can be attached if token is present
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_jwt_key_ai_forum_2026_secure'
      );
      req.user = decoded;
    } catch (err) {
      // Ignore token failure for optional auth
    }
  }
  next();
};

router.post('/chat', optionalAuth, handleChat);
router.get('/conversation/:id', getConversationHistory);

module.exports = router;
