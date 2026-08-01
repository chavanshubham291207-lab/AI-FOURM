const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');

// @desc    Get All Anonymous Logos for Voting
// @route   GET /api/voter/logos
// @access  Private (Voter only)
exports.getLogos = async (req, res, next) => {
  try {
    const setting = await CompetitionSetting.findOne();
    const currentPhase = setting ? setting.phase : 'REGISTRATION';

    // Fetch logos with strict field projection: EXCLUDE studentId, student details, etc.
    const logos = await Logo.find({ status: 'approved' })
      .select('anonymousCode title description image averageRating totalVotes createdAt')
      .sort({ createdAt: 1 });

    // Fetch list of votes cast by this voter
    const userVotes = await Vote.find({ voterId: req.user._id });
    const votedLogoMap = {};
    userVotes.forEach((v) => {
      votedLogoMap[v.logoId.toString()] = v.rating;
    });

    // Map logos with anonymous flag and voter's existing rating if any
    const anonymousLogos = logos.map((logo) => {
      const isVoted = Boolean(votedLogoMap[logo._id.toString()]);
      return {
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        title: logo.title,
        description: logo.description,
        image: logo.image,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        hasVoted: isVoted,
        userRating: isVoted ? votedLogoMap[logo._id.toString()] : null
      };
    });

    res.json({
      success: true,
      phase: currentPhase,
      totalLogos: anonymousLogos.length,
      logos: anonymousLogos
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Vote (Rating 1-5)
// @route   POST /api/voter/vote
// @access  Private (Voter only)
exports.submitVote = async (req, res, next) => {
  try {
    const setting = await CompetitionSetting.findOne();
    if (setting && setting.phase !== 'VOTING') {
      return res.status(400).json({
        success: false,
        message: `Voting is currently closed. Current competition phase is ${setting ? setting.phase : 'REGISTRATION'}.`
      });
    }

    const { logoId, rating } = req.body;

    if (!logoId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide logoId and rating'
      });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5'
      });
    }

    const logo = await Logo.findById(logoId);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo entry not found'
      });
    }

    // Check if voter already voted for this logo
    const existingVote = await Vote.findOne({
      logoId,
      voterId: req.user._id
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this logo. Multiple votes for the same logo are not allowed.'
      });
    }

    // Record vote
    await Vote.create({
      logoId,
      voterId: req.user._id,
      rating: numericRating
    });

    // Update logo rating metrics atomically
    const newTotalVotes = logo.totalVotes + 1;
    const newStarsSum = logo.totalStarsSum + numericRating;
    const newAverageRating = parseFloat((newStarsSum / newTotalVotes).toFixed(2));

    logo.totalVotes = newTotalVotes;
    logo.totalStarsSum = newStarsSum;
    logo.averageRating = newAverageRating;

    await logo.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for voting.',
      entry: {
        logoId: logo._id,
        anonymousCode: logo.anonymousCode,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        userRating: numericRating
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this logo.'
      });
    }
    next(error);
  }
};
