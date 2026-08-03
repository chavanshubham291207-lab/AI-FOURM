const User = require('../models/User');
const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');
const DuplicateAttempt = require('../models/DuplicateAttempt');
const QRCode = require('qrcode');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { generateAnonymousCode } = require('../utils/generateCode');
const { processUploadedFile } = require('../middleware/upload');
const { autoImportJsonLogos } = require('../services/logoImportService');

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
    setting = await CompetitionSetting.create({ phase: 'REGISTRATION' });
  }
  return setting;
};

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUniqueVoters = await Vote.distinct('email').then(res => res.length);
    const totalLogos = await Logo.countDocuments();
    const totalVotes = await Vote.countDocuments();
    const duplicateAttempts = await DuplicateAttempt.countDocuments();

    const logoAgg = await Logo.aggregate([
      {
        $group: {
          _id: null,
          globalAvgRating: { $avg: '$averageRating' }
        }
      }
    ]);

    const averageRating = logoAgg.length > 0 ? parseFloat(logoAgg[0].globalAvgRating.toFixed(2)) : 0;
    const setting = await getSetting();

    let winner = null;
    if (setting.winnerLogoId) {
      const winnerLogo = await Logo.findById(setting.winnerLogoId);
      if (winnerLogo) {
        winner = {
          logoId: winnerLogo._id,
          anonymousCode: winnerLogo.anonymousCode,
          title: winnerLogo.title,
          image: winnerLogo.image,
          averageRating: winnerLogo.averageRating,
          totalVotes: winnerLogo.totalVotes
        };
      }
    }

    const clientOrigin = getClientOrigin(req);
    const genericQrData = `${clientOrigin}/public-vote`;
    const genericQrCode = await QRCode.toDataURL(genericQrData);

    res.json({
      success: true,
      stats: {
        totalVoters: totalUniqueVoters,
        totalUniqueVoters,
        totalLogos,
        totalVotes,
        duplicateAttempts,
        averageRating,
        competitionStatus: setting.phase,
        deadline: setting.deadline,
        winner,
        remainingVotesLimit: setting.remainingVotesLimit,
        genericQrCode
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Participants (Voters)
// @route   GET /api/admin/participants
// @access  Private (Admin only)
exports.getParticipants = async (req, res, next) => {
  try {
    const voters = await Vote.aggregate([
      {
        $group: {
          _id: '$email',
          name: { $first: '$voterName' },
          email: { $first: '$email' },
          registeredAt: { $first: '$createdAt' }
        }
      },
      { $sort: { registeredAt: -1 } }
    ]);

    res.json({
      success: true,
      count: voters.length,
      participants: voters.map(v => ({
        id: v._id,
        name: v.name,
        email: v.email,
        registeredAt: v.registeredAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Logo List
// @route   GET /api/admin/logos
// @access  Private (Admin only)
exports.getLogoDetails = async (req, res, next) => {
  try {
    const logos = await Logo.find();
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
        title: logo.title,
        description: logo.description,
        image: `/api/public/logo-image/${logo._id}`,
        rawImage: logo.image,
        qrCode: logo.qrCode,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        status: logo.status,
        studentName: logo.studentName || 'Anonymous',
        studentEmail: logo.studentEmail || 'N/A',
        studentDepartment: logo.studentDepartment || 'N/A',
        submittedAt: logo.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Leaderboard & Analytics Data for Chart.js
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
exports.getAnalytics = async (req, res, next) => {
  try {
    const leaderboard = await Logo.find().sort({ averageRating: -1, totalVotes: -1 });

    // Rating breakdown distribution
    const ratingCounts = await Vote.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingCounts.forEach((r) => {
      ratingDistribution[r._id] = r.count;
    });

    res.json({
      success: true,
      leaderboard: leaderboard.map((logo, index) => ({
        rank: index + 1,
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        title: logo.title,
        image: `/api/public/logo-image/${logo._id}`,
        rawImage: logo.image,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        studentName: logo.studentName || 'Anonymous',
        studentDepartment: logo.studentDepartment || 'N/A'
      })),
      analytics: {
        ratingDistribution,
        departmentStats: []
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Competition Phase
// @route   PUT /api/admin/phase
// @access  Private (Admin only)
exports.updatePhase = async (req, res, next) => {
  try {
    const { phase, deadline } = req.body;

    const validPhases = ['REGISTRATION', 'VOTING', 'CLOSED', 'WINNER_ANNOUNCED'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({
        success: false,
        message: `Invalid phase. Allowed phases: ${validPhases.join(', ')}`
      });
    }

    const setting = await getSetting();
    setting.phase = phase;
    if (deadline) setting.deadline = new Date(deadline);

    // If switching to WINNER_ANNOUNCED and no winner logo set, pick top rated automatically
    if (phase === 'WINNER_ANNOUNCED' && !setting.winnerLogoId) {
      const topLogo = await Logo.findOne().sort({ totalVotes: -1, averageRating: -1 });
      if (topLogo) {
        setting.winnerLogoId = topLogo._id;
        topLogo.status = 'winner';
        await topLogo.save();
      }
    }

    await setting.save();

    res.json({
      success: true,
      message: `Competition phase updated to ${phase}`,
      setting
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Announce Competition Winner
// @route   POST /api/admin/announce-winner
// @access  Private (Admin only)
exports.announceWinner = async (req, res, next) => {
  try {
    const { logoId } = req.body;

    let targetLogo = null;
    if (logoId) {
      targetLogo = await Logo.findById(logoId);
    } else {
      targetLogo = await Logo.findOne().sort({ totalVotes: -1, averageRating: -1 });
    }

    if (!targetLogo) {
      return res.status(404).json({
        success: false,
        message: 'No logos available to select as winner'
      });
    }

    // Reset previous winner status if any
    await Logo.updateMany({ status: 'winner' }, { status: 'approved' });

    targetLogo.status = 'winner';
    await targetLogo.save();

    const setting = await getSetting();
    setting.winnerLogoId = targetLogo._id;
    setting.phase = 'WINNER_ANNOUNCED';
    setting.announcementDate = new Date();
    await setting.save();

    res.json({
      success: true,
      message: `Winner announced! ${targetLogo.anonymousCode} (${targetLogo.title}) is the winner.`,
      winner: {
        logoId: targetLogo._id,
        anonymousCode: targetLogo.anonymousCode,
        title: targetLogo.title,
        image: targetLogo.image,
        averageRating: targetLogo.averageRating,
        totalVotes: targetLogo.totalVotes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Results CSV
// @route   GET /api/admin/export
// @access  Private (Admin only)
exports.exportResults = async (req, res, next) => {
  try {
    const logos = await Logo.find().sort({ totalVotes: -1, averageRating: -1 });

    const csvHeaders = 'Rank,Entry ID,Logo Title,Average Rating,Total Votes\n';
    const csvRows = logos.map((logo, index) => {
      const cleanTitle = `"${(logo.title || '').replace(/"/g, '""')}"`;
      return `${index + 1},${logo.anonymousCode},${cleanTitle},${logo.averageRating},${logo.totalVotes}`;
    }).join('\n');

    const csvContent = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ai_forum_logo_competition_results.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
// @desc    Update Logo Details (Admin)
// @route   PUT /api/admin/logos/:id
// @access  Private (Admin only)
exports.updateLogo = async (req, res, next) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo entry not found'
      });
    }

    const { title, description } = req.body;
    if (title) logo.title = title;
    if (description) logo.description = description;

    // Image updates are no longer allowed; admin can only edit title/description.

    await logo.save();

    res.json({
      success: true,
      message: 'Logo updated successfully',
      logo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Logo (Admin)
// @route   DELETE /api/admin/logos/:id
// @access  Private (Admin only)
exports.deleteLogo = async (req, res, next) => {
  try {
    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      return res.status(404).json({
        success: false,
        message: 'Logo entry not found'
      });
    }

    // Delete logo's votes
    await Vote.deleteMany({ logoId: logo._id });

    // Remove logo setting association if it was the winner
    const setting = await getSetting();
    if (setting.winnerLogoId && setting.winnerLogoId.toString() === logo._id.toString()) {
      setting.winnerLogoId = null;
      setting.phase = 'REGISTRATION';
      await setting.save();
    }

    await Logo.findByIdAndDelete(logo._id);

    res.json({
      success: true,
      message: 'Logo and associated votes deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Voting Records
// @route   GET /api/admin/votes
// @access  Private (Admin only)
exports.getVotingRecords = async (req, res, next) => {
  try {
    const votes = await Vote.find()
      .populate('logoId', 'anonymousCode title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: votes.length,
      votes: votes.map(v => ({
        id: v._id,
        voterName: v.voterName,
        email: v.email,
        department: v.department,
        rating: v.rating,
        selectedCandidate: v.logoId ? `${v.logoId.anonymousCode} - ${v.logoId.title}` : 'Deleted Candidate',
        voteTime: v.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Synchronize logo entries from local folder
// @route   POST /api/admin/import-local
// @access  Private (Admin only)
exports.importLocalLogos = async (req, res, next) => {
  try {
    const localDir = path.join(__dirname, '..', 'uploads', 'logos');
    const uploadsPath = path.join(__dirname, '..', 'uploads');

    // Ensure local images folder exists
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    // Ensure server uploads directory exists
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    const files = fs.readdirSync(localDir);
    let newImportCount = 0;

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        continue; // Ignore non-image files
      }

      // Check if Logo entry already exists in database
      const existingLogo = await Logo.findOne({ localFileName: filename });
      if (existingLogo) {
        continue;
      }

      // Copy file to server/uploads/ with unique name to prevent collisions
      const cleanFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const destFilename = `local-${Date.now()}-${cleanFileName}`;
      const srcPath = path.join(localDir, filename);
      const destPath = path.join(uploadsPath, destFilename);

      fs.copyFileSync(srcPath, destPath);

      // Parse student name and title from the filename
      const baseName = path.parse(filename).name.trim();

      // Clean baseName from Google Drive/Forms sharing suffix patterns just in case
      const cleanLabel = baseName.replace(/\s+(image|pdf|video|doc)\s+shared/i, '').trim();

      let studentName = 'Anonymous Student';
      let title = cleanLabel;

      const parts = cleanLabel.split(' - ');
      if (parts.length > 1) {
        const rawName = parts[parts.length - 1];
        studentName = rawName.trim();
        title = parts.slice(0, -1).join(' - ').trim();
      } else if (cleanLabel.includes(' ')) {
        studentName = cleanLabel.trim();
        title = `${studentName} Design`;
      } else {
        title = cleanLabel;
      }

      // Generate student email dynamically
      const cleanName = studentName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const studentEmail = cleanName ? `${cleanName}@jspmrscoe.edu.in` : 'student@jspmrscoe.edu.in';

      // Deterministic department based on name hash
      const departments = [
        'Computer Engineering',
        'Information Technology',
        'AI & Data Science',
        'Electronics & Telecommunication',
        'Mechanical Engineering'
      ];
      let hash = 0;
      for (let i = 0; i < studentName.length; i++) {
        hash = studentName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const studentDepartment = departments[Math.abs(hash) % departments.length];

      // Auto-generate anonymous entry code
      const currentCount = await Logo.countDocuments();
      const anonymousCode = `LOGO-${String(1001 + currentCount)}`;

      // Format static URL served by MERN server
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:5000';
      const image = `${protocol}://${host}/uploads/${destFilename}`;

      // Create Logo document
      const logo = await Logo.create({
        title,
        description: `Imported design entry by ${studentName}.`,
        image,
        localFileName: filename,
        anonymousCode,
        studentName,
        studentEmail,
        studentDepartment,
        status: 'approved'
      });

      // Generate unique QR code pointing to front-end /vote-logo/:id
      const clientOrigin = getClientOrigin(req);
      const qrData = `${clientOrigin}/vote-logo/${logo._id}`;
      const qrCodeBase64 = await QRCode.toDataURL(qrData);
      logo.qrCode = qrCodeBase64;
      await logo.save();

      newImportCount++;
    }

    res.json({
      success: true,
      message: `Local directory synchronization completed. Imported ${newImportCount} new candidates from local downloads folder.`,
      newCount: newImportCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import logo entries from data/logos.json into MongoDB
// @route   POST /api/admin/import-json
// @access  Private (Admin only)
exports.importJsonLogos = async (req, res, next) => {
  try {
    const importedCount = await autoImportJsonLogos();
    res.json({
      success: true,
      message: `Successfully imported ${importedCount} logo entries from data/logos.json to MongoDB.`,
      importedCount
    });
  } catch (error) {
    next(error);
  }
};

