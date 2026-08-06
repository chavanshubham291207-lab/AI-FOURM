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
        rawImage: logo.image,
        updatedAt: logo.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

const { getOrGeneratePdfPreview } = require('../services/pdfPreviewService');

// @desc    Proxy/stream logo image to prevent CORS / third-party blocking
const generateFallbackSvgPlaceholder = (logoCode, title) => {
  const cleanCode = (logoCode || 'LOGO-ENTRY').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanTitle = (title || 'Logo Candidate').replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="none">
    <rect width="600" height="600" rx="24" fill="#0f172a"/>
    <rect x="2" y="2" width="596" height="596" rx="22" stroke="#1e293b" stroke-width="4"/>
    <circle cx="300" cy="240" r="70" fill="#1e293b" stroke="#334155" stroke-width="4"/>
    <path d="M270 240L330 240M300 210L300 270" stroke="#6366f1" stroke-width="6" stroke-linecap="round"/>
    <text x="300" y="370" text-anchor="middle" fill="#818cf8" font-family="system-ui, sans-serif" font-size="28" font-weight="800" letter-spacing="2">${cleanCode}</text>
    <text x="300" y="415" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="18" font-weight="600">${cleanTitle}</text>
    <text x="300" y="455" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif" font-size="14">AI Forum Logo Competition Entry</text>
  </svg>`;
};

// @desc    Proxy/stream logo image to prevent CORS / third-party blocking
// @route   GET /api/public/logo-image/:id
// @access  Public
exports.getLogoImage = async (req, res, next) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo || !logo.image) {
      console.warn(`⚠️ [LOGO_IMAGE_MISSING]: No logo or image path defined for logo ID ${req.params.id}`);
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(generateFallbackSvgPlaceholder(logo ? logo.anonymousCode : 'LOGO-ENTRY', logo ? logo.title : 'Logo Candidate'));
    }

    const imgUrl = (logo.image || '').trim();

    // 1. Direct Base64 Data URL handling (for serverless Vercel / MongoDB stored image data)
    if (imgUrl.startsWith('data:image/')) {
      const matches = imgUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const imgBuffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.send(imgBuffer);
      }
    }

    // 2. Direct local image check (prioritize uploaded local files)
    let localFileName = logo.localFileName;
    if (!localFileName && imgUrl.includes('/uploads/')) {
      const rawName = imgUrl.split('/uploads/').pop();
      localFileName = rawName ? rawName.split('?')[0].split('#')[0] : null;
    }

    if (localFileName) {
      const cleanFileName = localFileName.split('?')[0].split('#')[0];
      const localPath = path.join(__dirname, '..', 'uploads', cleanFileName);
      if (fs.existsSync(localPath) && !cleanFileName.toLowerCase().endsWith('.pdf')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(localPath);
      }
    }

    // 3. Direct Cloudinary / external HTTP image redirect (if logo image is an external image URL and not Google Drive PDF)
    const isDriveLink = imgUrl.includes('drive.google.com') || Boolean(logo.driveFileId);
    const isPdf = imgUrl.toLowerCase().endsWith('.pdf') || (logo.pdfUrl && logo.pdfUrl.toLowerCase().endsWith('.pdf'));
    const isRemoteHttpImage = (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) &&
                              !imgUrl.includes('/api/public/logo-image/') &&
                              !imgUrl.includes('/uploads/');

    if (isRemoteHttpImage && !isDriveLink && !isPdf) {
      return res.redirect(imgUrl);
    }

    // 4. Attempt to retrieve cached or generated PDF/image preview
    const previewFilePath = await getOrGeneratePdfPreview(logo);
    if (previewFilePath && fs.existsSync(previewFilePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(previewFilePath);
    }

    // 5. Fallback: If preview generation failed but logo.image is a remote URL, redirect as last resort
    if (isRemoteHttpImage) {
      return res.redirect(imgUrl);
    }

    // 6. Guarantee a clean SVG placeholder image response instead of broken image / 404
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(generateFallbackSvgPlaceholder(logo.anonymousCode, logo.title));
  } catch (error) {
    console.error(`❌ Error serving logo image ${req.params.id}:`, error.message);
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(generateFallbackSvgPlaceholder('LOGO-ENTRY', 'Logo Candidate'));
  }
};');
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

