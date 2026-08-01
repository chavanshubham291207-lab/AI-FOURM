const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getParticipants,
  getLogoDetails,
  getAnalytics,
  updatePhase,
  announceWinner,
  exportResults
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/participants', getParticipants);
router.get('/logos', getLogoDetails);
router.get('/analytics', getAnalytics);
router.put('/phase', updatePhase);
router.post('/announce-winner', announceWinner);
router.get('/export', exportResults);

module.exports = router;
