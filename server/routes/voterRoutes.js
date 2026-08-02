const express = require('express');
const router = express.Router();
const { getLogos, getLogoById, submitVote } = require('../controllers/voterController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('voter'));

router.get('/logos', getLogos);
router.get('/logos/:id', getLogoById);
router.post('/vote', submitVote);

module.exports = router;
