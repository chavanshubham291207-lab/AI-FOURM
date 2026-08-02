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
  uploadLogo,
  updateLogo,
  deleteLogo
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/participants', getParticipants);
router.get('/logos', getLogoDetails);
router.get('/analytics', getAnalytics);
router.put('/phase', updatePhase);
router.post('/announce-winner', announceWinner);
router.get('/export', exportResults);

// Logo CRUD
router.post('/logos', upload.single('image'), uploadLogo);
router.put('/logos/:id', upload.single('image'), updateLogo);
router.delete('/logos/:id', deleteLogo);

module.exports = router;
