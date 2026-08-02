const express = require('express');
const router = express.Router();
const { getPublicConfig, getPublicLogos, submitPublicVote, getLogoImage, getVoterStatus } = require('../controllers/publicController');

router.get('/config', getPublicConfig);
router.get('/logos', getPublicLogos);
router.get('/logo-image/:id', getLogoImage);
router.get('/voter-status', getVoterStatus);
router.post('/vote', submitPublicVote);

module.exports = router;
