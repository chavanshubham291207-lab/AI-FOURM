const express = require('express');
const router = express.Router();
const {
  getSubmission,
  uploadLogo,
  updateSubmission
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(protect);
router.use(authorize('student'));

router.get('/submission', getSubmission);
router.post('/upload', upload.single('image'), uploadLogo);
router.put('/submission', upload.single('image'), updateSubmission);

module.exports = router;
