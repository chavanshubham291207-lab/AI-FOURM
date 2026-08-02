const express = require('express');
const router = express.Router();
const { getPublicConfig, getPublicLogos, submitPublicVote } = require('../controllers/publicController');

router.get('/config', getPublicConfig);
router.get('/logos', getPublicLogos);
router.post('/vote', submitPublicVote);

module.exports = router;
