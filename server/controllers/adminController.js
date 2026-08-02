const User = require('../models/User');
const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');
const QRCode = require('qrcode');
const https = require('https');
const { generateAnonymousCode } = require('../utils/generateCode');
const { processUploadedFile } = require('../middleware/upload');

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
    const totalVoters = await Vote.distinct('email').then(res => res.length);
    const totalLogos = await Logo.countDocuments();
    const totalVotes = await Vote.countDocuments();

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

    const clientOrigin = req.headers.origin || 'http://localhost:3000';
    const genericQrData = `${clientOrigin}/public-vote`;
    const genericQrCode = await QRCode.toDataURL(genericQrData);

    res.json({
      success: true,
      stats: {
        totalVoters,
        totalLogos,
        totalVotes,
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
    const logos = await Logo.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: logos.length,
      logos: logos.map(logo => ({
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        title: logo.title,
        description: logo.description,
        image: logo.image,
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
        image: logo.image,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        studentName: logo.studentName || 'Anonymous',
        studentEmail: logo.studentEmail || 'N/A',
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

// @desc    Upload Logo (Admin)
// @route   POST /api/admin/logos
// @access  Private (Admin only)
exports.uploadLogo = async (req, res, next) => {
  try {
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

    // Create Logo model instance
    const logo = new Logo({
      studentId: req.user._id, // Admin acts as the uploader here to avoid validation error if schema demands studentId
      anonymousCode,
      title,
      description,
      image: fileUpload.url,
      cloudinaryPublicId: fileUpload.publicId
    });

    // Generate unique QR code pointing to front-end /vote-logo/:id
    const clientOrigin = req.headers.origin || 'http://localhost:3000';
    const qrData = `${clientOrigin}/vote-logo/${logo._id}`;
    const qrCodeBase64 = await QRCode.toDataURL(qrData);
    logo.qrCode = qrCodeBase64;

    await logo.save();

    res.status(201).json({
      success: true,
      message: `Logo uploaded successfully! Entry ID: ${anonymousCode}`,
      logo
    });
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

// @desc    Synchronize logo entries from Google Drive folder
// @route   POST /api/admin/sync-drive
// @access  Private (Admin only)
exports.syncGoogleDriveLogos = async (req, res, next) => {
  try {
    const driveUrl = 'https://drive.google.com/drive/folders/1MW-rYsTq4k_1jX0yKC32lwslgM-JB0ZAL7d488RmE2Yhdffv9jp-8bG19jwpLTqYKv6C-bb-';
    
    // Fetch folder HTML page
    const html = await new Promise((resolve, reject) => {
      https.get(driveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }, (resp) => {
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        resp.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const rows = html.split(/<tr/i);
    let newImportCount = 0;

    for (const row of rows) {
      const idMatch = row.match(/data-id="([^"]+)"/);
      const labelMatch = row.match(/aria-label="([^"]+)"/);
      
      if (idMatch && labelMatch) {
        const fileId = idMatch[1];
        const label = labelMatch[1];

        // Skip folders or system descriptors
        if (label.toLowerCase().includes('folder') || fileId.startsWith('1ZUoR') || fileId.startsWith('1MW-r')) {
          continue;
        }

        // Clean label: strip suffix like " Image Shared", " PDF Shared", etc.
        const cleanLabel = label.replace(/\s+(image|pdf|video|doc)\s+shared/i, '').trim();

        // Check if Logo entry already exists in database
        const existingLogo = await Logo.findOne({ driveFileId: fileId });
        if (existingLogo) {
          continue;
        }

        // Parse student name and title
        let studentName = 'Anonymous Student';
        let title = cleanLabel;

        const parts = cleanLabel.split(' - ');
        if (parts.length > 1) {
          const rawName = parts[parts.length - 1];
          studentName = rawName.replace(/\.[^/.]+$/, "").trim(); // Strip file extension (e.g. .png, .jpg)
          
          // Reassemble title from remaining parts
          title = parts.slice(0, -1).join(' - ').trim();
        } else {
          // If no separator, try to strip extension
          title = cleanLabel.replace(/\.[^/.]+$/, "").trim();
        }

        // Clean name
        studentName = studentName.replace(/\s+(image|pdf|video|doc)$/i, '').trim();

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

        // Thumbnail direct URL (bypasses Google Auth)
        const image = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

        // Create Logo document
        await Logo.create({
          title,
          description: `Google Drive imported design entry by ${studentName}.`,
          image,
          driveFileId: fileId,
          anonymousCode,
          studentName,
          studentEmail,
          studentDepartment,
          status: 'approved'
        });

        newImportCount++;
      }
    }

    res.json({
      success: true,
      message: `Google Drive synchronization completed. Imported ${newImportCount} new candidates.`,
      newCount: newImportCount
    });
  } catch (error) {
    next(error);
  }
};
