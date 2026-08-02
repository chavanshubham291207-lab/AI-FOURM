const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getParticipants,
  getLogoDetails,
  getAnalytics,
  updatePhase,
  announceWinner,
  exportResults,
  updateLogo,
  deleteLogo,
  getVotingRecords,
  importLocalLogos,
  importJsonLogos
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Temporary development-only routes
router.post('/import-local', importLocalLogos);
router.post('/import-json', importJsonLogos);

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/participants', getParticipants);
router.get('/logos', getLogoDetails);
router.get('/analytics', getAnalytics);
router.put('/phase', updatePhase);
router.post('/announce-winner', announceWinner);
router.get('/export', exportResults);
router.get('/votes', getVotingRecords);



// Logo CRUD

router.put('/logos/:id', updateLogo);
router.delete('/logos/:id', deleteLogo);

module.exports = router;
