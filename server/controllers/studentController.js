const Logo = require('../models/Logo');
const CompetitionSetting = require('../models/CompetitionSetting');
const { generateAnonymousCode } = require('../utils/generateCode');
const { processUploadedFile } = require('../middleware/upload');

// Helper to get active competition setting
const getSetting = async () => {
  let setting = await CompetitionSetting.findOne();
  if (!setting) {
    setting = await CompetitionSetting.create({ phase: 'REGISTRATION' });
  }
  return setting;
};

// @desc    Get Student Submission
// @route   GET /api/student/submission
// @access  Private (Student only)
exports.getSubmission = async (req, res, next) => {
  try {
    const logo = await Logo.findOne({ studentId: req.user._id });
    const setting = await getSetting();

    let winnerInfo = null;
    if (setting.phase === 'WINNER_ANNOUNCED' && setting.winnerLogoId) {
      const winnerLogo = await Logo.findById(setting.winnerLogoId).populate('studentId', 'name department branch');
      if (winnerLogo) {
        winnerInfo = {
          anonymousCode: winnerLogo.anonymousCode,
          title: winnerLogo.title,
          description: winnerLogo.description,
          image: winnerLogo.image,
          averageRating: winnerLogo.averageRating,
          totalVotes: winnerLogo.totalVotes,
          studentName: winnerLogo.studentId ? winnerLogo.studentId.name : 'Anonymous',
          department: winnerLogo.studentId ? winnerLogo.studentId.department : ''
        };
      }
    }

    res.json({
      success: true,
      submission: logo || null,
      competition: {
        phase: setting.phase,
        deadline: setting.deadline,
        announcementDate: setting.announcementDate,
        winner: winnerInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload Logo Submission
// @route   POST /api/student/upload
// @access  Private (Student only)
exports.uploadLogo = async (req, res, next) => {
  try {
    const setting = await getSetting();

    if (setting.phase !== 'REGISTRATION') {
      return res.status(400).json({
        success: false,
        message: `Submission closed! Competition is currently in ${setting.phase} phase.`
      });
    }

    if (setting.deadline && new Date() > new Date(setting.deadline)) {
      return res.status(400).json({
        success: false,
        message: 'Submission deadline has passed!'
      });
    }

    // Check if student already submitted a logo
    const existingLogo = await Logo.findOne({ studentId: req.user._id });
    if (existingLogo) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a logo! Only ONE logo submission is allowed per student.'
      });
    }

    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both title and description'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a logo image file'
      });
    }

    const fileUpload = await processUploadedFile(req.file, req);
    if (!fileUpload) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process uploaded file'
      });
    }

    const anonymousCode = await generateAnonymousCode();

    const logo = await Logo.create({
      studentId: req.user._id,
      anonymousCode,
      title,
      description,
      image: fileUpload.url,
      cloudinaryPublicId: fileUpload.publicId
    });

    res.status(201).json({
      success: true,
      message: `Logo submitted successfully! Your entry ID is ${anonymousCode}`,
      submission: logo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit/Update Submission before deadline
// @route   PUT /api/student/submission
// @access  Private (Student only)
exports.updateSubmission = async (req, res, next) => {
  try {
    const setting = await getSetting();

    if (setting.phase !== 'REGISTRATION') {
      return res.status(400).json({
        success: false,
        message: 'Submissions are locked! Editing is not allowed during or after voting.'
      });
    }

    if (setting.deadline && new Date() > new Date(setting.deadline)) {
      return res.status(400).json({
        success: false,
        message: 'Submission deadline has passed! Editing is disabled.'
      });
    }

    const logo = await Logo.findOne({ studentId: req.user._id });
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'No submission found to update'
      });
    }

    const { title, description } = req.body;
    if (title) logo.title = title;
    if (description) logo.description = description;

    if (req.file) {
      const fileUpload = await processUploadedFile(req.file, req);
      if (fileUpload) {
        logo.image = fileUpload.url;
        logo.cloudinaryPublicId = fileUpload.publicId;
      }
    }

    await logo.save();

    res.json({
      success: true,
      message: 'Submission updated successfully',
      submission: logo
    });
  } catch (error) {
    next(error);
  }
};
