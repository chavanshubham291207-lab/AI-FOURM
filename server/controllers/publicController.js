const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');
const { validateEmailAddress } = require('../utils/emailValidator');

// Helper to ensure setting document exists
const getSetting = async () => {
  let setting = await CompetitionSetting.findOne();
  if (!setting) {
    setting = await CompetitionSetting.create({ phase: 'REGISTRATION', remainingVotesLimit: 500 });
  }
  return setting;
};

// @desc    Get Public Competition Config & Limits
// @route   GET /api/public/config
// @access  Public
exports.getPublicConfig = async (req, res, next) => {
  try {
    const setting = await getSetting();
    res.json({
      success: true,
      phase: setting.phase,
      remainingLimit: setting.remainingVotesLimit
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Candidate Logos (Personal details hidden)
// @route   GET /api/public/logos
// @access  Public
exports.getPublicLogos = async (req, res, next) => {
  try {
    // Return approved logos
    const logos = await Logo.find({ status: 'approved' }).sort({ anonymousCode: 1 });
    
    res.json({
      success: true,
      count: logos.length,
      logos: logos.map(logo => ({
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        image: logo.image,
        description: logo.description
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Public Vote (No login required, limit checked)
// @route   POST /api/public/vote
// @access  Public
exports.submitPublicVote = async (req, res, next) => {
  try {
    const { logoId, voterName, email, department } = req.body;

    if (!logoId || !voterName || !email || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields (candidate, name, email, department)'
      });
    }

    // Validate email format
    const emailCheck = validateEmailAddress(email);
    if (!emailCheck.valid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message
      });
    }
    const cleanEmail = emailCheck.cleanEmail;

    // Check setting & scan limit
    const setting = await getSetting();
    if (setting.phase !== 'VOTING') {
      return res.status(400).json({
        success: false,
        message: `Voting is currently closed. Competition phase is ${setting.phase}.`
      });
    }

    if (setting.remainingVotesLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Voting has closed because the maximum voting limit of 500 has been reached.'
      });
    }

    const logo = await Logo.findById(logoId);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Candidate logo not found'
      });
    }

    // Check duplicate vote for this email on this logo
    const existingVote = await Vote.findOne({ logoId, email: cleanEmail });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this design entry.'
      });
    }

    // Record public vote
    await Vote.create({
      logoId,
      voterName: voterName.trim(),
      email: cleanEmail,
      department: department.trim(),
      rating: 5 // Default rating value
    });

    // Update Logo voting stats
    const newTotalVotes = logo.totalVotes + 1;
    const newStarsSum = logo.totalStarsSum + 5;
    logo.totalVotes = newTotalVotes;
    logo.totalStarsSum = newStarsSum;
    logo.averageRating = parseFloat((newStarsSum / newTotalVotes).toFixed(2));
    await logo.save();

    // Decrement scan limit
    setting.remainingVotesLimit -= 1;
    if (setting.remainingVotesLimit <= 0) {
      setting.phase = 'CLOSED';
    }
    await setting.save();

    res.status(201).json({
      success: true,
      message: 'Your vote has been recorded successfully',
      remainingLimit: setting.remainingVotesLimit
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this design entry.'
      });
    }
    next(error);
  }
};

// @desc    Register Successful Public QR Scan
// @route   POST /api/public/scan
// @access  Public
exports.submitPublicScan = async (req, res, next) => {
  try {
    const setting = await CompetitionSetting.findOne();
    if (!setting) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    if (setting.phase !== 'VOTING') {
      return res.status(400).json({
        success: false,
        message: `Voting is currently closed. Competition phase is ${setting.phase}.`
      });
    }

    if (setting.remainingVotesLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Voting has closed because the maximum voting limit of 500 has been reached.'
      });
    }

    // Decrement scan limit by 1
    setting.remainingVotesLimit -= 1;
    if (setting.remainingVotesLimit <= 0) {
      setting.phase = 'CLOSED';
    }
    await setting.save();

    res.json({
      success: true,
      message: 'Scan registered successfully',
      remainingLimit: setting.remainingVotesLimit
    });
  } catch (error) {
    next(error);
  }
};
