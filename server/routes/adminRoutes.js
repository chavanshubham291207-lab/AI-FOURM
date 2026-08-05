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
  createLogo,
  resetCompetition,
  getVotingRecords,
  importLocalLogos,
  importJsonLogos
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { upload, uploadLogoAndPdf } = require('../middleware/upload');

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
router.post('/reset-competition', resetCompetition);
router.get('/export', exportResults);
router.get('/votes', getVotingRecords);



// Logo CRUD

router.post('/logos', uploadLogoAndPdf, createLogo);
router.put('/logos/:id', uploadLogoAndPdf, updateLogo);
router.delete('/logos/:id', deleteLogo);

module.exports = router;
