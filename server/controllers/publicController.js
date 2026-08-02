const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');
const QRCode = require('qrcode');
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
    
    // Generate generic public QR code dynamically
    const clientOrigin = req.headers.origin || 'http://localhost:3000';
    const genericQrData = `${clientOrigin}/public-vote`;
    const genericQrCode = await QRCode.toDataURL(genericQrData);

    res.json({
      success: true,
      phase: setting.phase,
      remainingLimit: setting.remainingVotesLimit,
      genericQrCode
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
        title: logo.title,
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
    const { logoId, voterId, voterName, email, department, rating } = req.body;

    if (!logoId || !voterId || !voterName || !email || !department || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all fields (logo, voter key, name, email, department, rating)'
      });
    }

    const ratingNum = parseInt(rating, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating value must be an integer between 1 and 5'
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
        message: `Voting/Rating is currently closed. Competition phase is ${setting.phase}.`
      });
    }

    if (setting.remainingVotesLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Voting/Rating has closed because the maximum limit of 500 has been reached.'
      });
    }

    const logo = await Logo.findById(logoId);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo design candidate not found'
      });
    }

    // Check duplicate rating for this voter or email on this logo
    const existingVote = await Vote.findOne({
      logoId,
      $or: [{ email: cleanEmail }, { voterId }]
    });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this logo design entry.'
      });
    }

    // Record public rating
    await Vote.create({
      logoId,
      voterId: voterId.trim(),
      voterName: voterName.trim(),
      email: cleanEmail,
      department: department.trim(),
      rating: ratingNum
    });

    // Update Logo voting stats
    const newTotalVotes = logo.totalVotes + 1;
    const newStarsSum = logo.totalStarsSum + ratingNum;
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
      message: 'Your rating has been submitted successfully',
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
