const express = require('express');
const router = express.Router();
const { getPublicConfig, getPublicLogos, submitPublicVote, submitPublicScan } = require('../controllers/publicController');

router.get('/config', getPublicConfig);
router.get('/logos', getPublicLogos);
router.post('/vote', submitPublicVote);
router.post('/scan', submitPublicScan);

module.exports = router;
