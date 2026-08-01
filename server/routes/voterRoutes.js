const express = require('express');
const router = express.Router();
const { getLogos, submitVote } = require('../controllers/voterController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('voter'));

router.get('/logos', getLogos);
router.post('/vote', submitVote);

module.exports = router;
