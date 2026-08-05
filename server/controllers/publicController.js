const https = require('https');
const fs = require('fs');
const path = require('path');
const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');
const QRCode = require('qrcode');
const { MAX_VOTES } = require('../config/constants');
const { validateEmailAddress } = require('../utils/emailValidator');

// Helper to determine frontend client origin dynamically
const getClientOrigin = (req) => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.replace(/\/$/, '');
  if (req && req.headers && req.headers.referer) {
    try {
      const u = new URL(req.headers.referer);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }
  if (req && req.headers && req.headers.origin) {
    return req.headers.origin.replace(/\/$/, '');
  }
  if (req && req.get) {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    if (host) return `${protocol}://${host}`;
  }
  return 'http://localhost:5173';
};

// Helper to ensure setting document exists
const getSetting = async () => {
  let setting = await CompetitionSetting.findOne();
  if (!setting) {
    setting = await CompetitionSetting.create({ phase: 'REGISTRATION', remainingVotesLimit: MAX_VOTES });
  }
  const totalVotesCount = await Vote.countDocuments();
  const calculatedRemaining = Math.max(0, MAX_VOTES - totalVotesCount);
  if (setting.remainingVotesLimit !== calculatedRemaining) {
    setting.remainingVotesLimit = calculatedRemaining;
    await setting.save();
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
    const clientOrigin = getClientOrigin(req);
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
    const logos = await Logo.find({ status: 'approved' });
    logos.sort((a, b) => {
      const numA = parseInt((a.anonymousCode || '').replace(/\D/g, ''), 10) || 0;
      const numB = parseInt((b.anonymousCode || '').replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
    
    res.json({
      success: true,
      count: logos.length,
      logos: logos.map(logo => ({
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        image: `/api/public/logo-image/${logo._id}`,
        rawImage: logo.image
      }))
    });
  } catch (error) {
    next(error);
  }
};

const { getOrGeneratePdfPreview } = require('../services/pdfPreviewService');

// @desc    Proxy/stream logo image to prevent CORS / third-party blocking
// @route   GET /api/public/logo-image/:id
// @access  Public
exports.getLogoImage = async (req, res, next) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo || !logo.image) {
      return res.status(404).send('Preview unavailable');
    }

    // Direct local non-PDF image check (prioritize direct uploaded image files)
    if (logo.image.includes('/uploads/')) {
      const fileName = logo.image.split('/uploads/').pop();
      const localPath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(localPath) && !fileName.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(localPath);
      }
    }

    // Attempt to retrieve cached or generated PDF/image preview
    const previewFilePath = await getOrGeneratePdfPreview(logo);
    if (previewFilePath && fs.existsSync(previewFilePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(previewFilePath);
    }

    return res.status(404).send('Preview unavailable');
  } catch (error) {
    console.error(`Error serving logo image ${req.params.id}:`, error.message);
    return res.status(404).send('Preview unavailable');
  }
};

const DuplicateAttempt = require('../models/DuplicateAttempt');

// @desc    Check if voter has already voted
// @route   GET /api/public/voter-status
// @access  Public
exports.getVoterStatus = async (req, res, next) => {
  try {
    const voterId = req.query.voterId || req.query.deviceId;
    const email = req.query.email;
    const fingerprint = req.query.fingerprint || '';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const query = [];
    if (voterId) query.push({ voterId: voterId.trim() });
    if (email) query.push({ email: email.toLowerCase().trim() });
    if (fingerprint && clientIp) query.push({ ipAddress: clientIp, fingerprint });

    if (query.length === 0) {
      return res.json({ success: true, hasVoted: false, ratedLogoIds: [] });
    }

    const existingVotes = await Vote.find({ $or: query });
    const ratedLogoIds = existingVotes.map(v => v.logoId.toString());

    res.json({
      success: true,
      hasVoted: ratedLogoIds.length > 0,
      ratedLogoIds,
      votedCount: ratedLogoIds.length
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
    const { logoId, voterId, voterName, email, department, rating, fingerprint } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

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
        message: `Voting limit reached. Maximum limit of ${MAX_VOTES} votes has been reached.`
      });
    }

    const logo = await Logo.findById(logoId);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo design candidate not found'
      });
    }

    // PER-LOGO DUPLICATE CHECK: Check if voter has ALREADY rated THIS specific logo
    const existingVote = await Vote.findOne({
      logoId,
      $or: [
        { voterId: voterId.trim() },
        { email: cleanEmail },
        { ipAddress: clientIp, fingerprint: fingerprint || '' }
      ]
    });

    if (existingVote) {
      // Log duplicate attempt for audit & metrics
      await DuplicateAttempt.create({
        voterId: voterId.trim(),
        ipAddress: clientIp,
        fingerprint: fingerprint || '',
        email: cleanEmail,
        reason: `Duplicate rating attempt rejected for logo ${logoId}`
      });

      return res.status(409).json({
        success: false,
        alreadyVoted: true,
        message: 'You have already rated this logo.'
      });
    }

    // Record public rating
    const newVote = await Vote.create({
      logoId,
      voterId: voterId.trim(),
      voterName: voterName.trim(),
      email: cleanEmail,
      department: department.trim(),
      rating: ratingNum,
      ipAddress: clientIp,
      fingerprint: fingerprint || ''
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

    // Fetch updated list of rated logos for this voter
    const userVotes = await Vote.find({
      $or: [
        { voterId: voterId.trim() },
        { email: cleanEmail },
        { ipAddress: clientIp, fingerprint: fingerprint || '' }
      ]
    });
    const ratedLogoIds = userVotes.map(v => v.logoId.toString());

    res.json({
      success: true,
      alreadyVoted: false,
      message: 'Thank you! Your rating for this logo has been recorded.',
      remainingVotesLimit: setting.remainingVotesLimit,
      ratedLogoIds,
      vote: {
        id: newVote._id,
        logoId: newVote.logoId,
        rating: newVote.rating
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      await DuplicateAttempt.create({
        voterId: (req.body.voterId || '').trim(),
        ipAddress: clientIp,
        fingerprint: req.body.fingerprint || '',
        email: req.body.email || '',
        reason: 'Duplicate key error on Mongo unique index'
      });
      return res.status(409).json({
        success: false,
        alreadyVoted: true,
        message: 'You have already rated this logo.'
      });
    }
    next(error);
  }
};

