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

const { MAX_VOTES } = require('../config/constants');

// Helper to ensure setting document exists with dynamic remaining limit
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
        pdfUrl: logo.pdfUrl || (logo.image && logo.image.toLowerCase().endsWith('.pdf') ? logo.image : ''),
        qrCode: logo.qrCode,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        status: logo.status,
        studentName: logo.studentName || 'Anonymous',
        studentEmail: logo.studentEmail || 'N/A',
        studentDepartment: logo.studentDepartment || 'N/A',
        studentRollNumber: logo.studentRollNumber || logo.rollNumber || 'N/A',
        submittedAt: logo.createdAt,
        updatedAt: logo.updatedAt
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
// @desc    Update Logo Details & Image (Admin)
// @route   PUT /api/admin/logos/:id
// @access  Private (Admin only)
exports.updateLogo = async (req, res, next) => {
  try {
    console.log(`📝 [ADMIN_UPDATE_START] req.params.id: ${req.params.id}`);
    console.log(`📝 [ADMIN_UPDATE_START] req.body:`, JSON.stringify(req.body, null, 2));
    console.log(`📝 [ADMIN_UPDATE_START] req.file:`, req.file || 'No req.file (single file field)');
    console.log(`📝 [ADMIN_UPDATE_START] req.files:`, req.files || 'No req.files (multi-file fields)');

    const logo = await Logo.findById(req.params.id);
    if (!logo) {
      console.warn(`⚠️ [ADMIN_UPDATE_404] Logo ID ${req.params.id} not found in MongoDB.`);
      return res.status(404).json({
        success: false,
        message: `Logo entry not found: No document exists with ID ${req.params.id}`
      });
    }

    const {
      studentName,
      studentEmail,
      studentDepartment,
      studentRollNumber,
      title,
      description,
      anonymousCode,
      logoCode,
      driveFileId
    } = req.body;

    // 1. Validate & Update Student Name
    if (studentName !== undefined) {
      if (!studentName.trim()) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Empty studentName provided for logo ${logo._id}`);
        return res.status(400).json({ success: false, message: 'Student Name cannot be empty.' });
      }
      logo.studentName = studentName.trim();
    }

    // 2. Validate & Update Student Email
    if (studentEmail !== undefined) {
      if (!studentEmail.trim()) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Empty studentEmail provided for logo ${logo._id}`);
        return res.status(400).json({ success: false, message: 'Email Address cannot be empty.' });
      }
      const emailCheck = validateEmailAddress(studentEmail);
      if (!emailCheck.valid) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Invalid email ${studentEmail}: ${emailCheck.message}`);
        return res.status(400).json({ success: false, message: emailCheck.message });
      }
      logo.studentEmail = emailCheck.cleanEmail;
    }

    // 3. Validate & Update Department
    if (studentDepartment !== undefined) {
      if (!studentDepartment.trim()) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Empty studentDepartment provided for logo ${logo._id}`);
        return res.status(400).json({ success: false, message: 'Department cannot be empty.' });
      }
      logo.studentDepartment = studentDepartment.trim();
    }

    // 4. Update Roll Number
    if (studentRollNumber !== undefined) {
      logo.studentRollNumber = studentRollNumber.trim();
    }

    // 5. Update Title & Description
    if (title !== undefined && title.trim() !== '') logo.title = title.trim();
    if (description !== undefined && description.trim() !== '') logo.description = description.trim();

    // 6. Handle Rename Logo Code
    const targetCode = anonymousCode || logoCode;
    if (targetCode && targetCode.trim() !== '' && targetCode.trim() !== logo.anonymousCode) {
      const cleanCode = targetCode.trim();
      if (cleanCode.length > 30) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Logo code ${cleanCode} exceeds 30 chars`);
        return res.status(400).json({
          success: false,
          message: 'Logo code cannot exceed 30 characters'
        });
      }

      // Check if duplicate code exists (case-insensitive search)
      const existingLogo = await Logo.findOne({
        anonymousCode: { $regex: new RegExp(`^${cleanCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        _id: { $ne: logo._id }
      });

      if (existingLogo) {
        console.warn(`⚠️ [ADMIN_UPDATE_VALIDATION_ERROR] Logo code ${cleanCode} already exists on logo ${existingLogo._id}`);
        return res.status(400).json({
          success: false,
          message: 'This logo code already exists.'
        });
      }

      logo.anonymousCode = cleanCode;
    }

    // 7. Process file upload if new image or PDF file provided
    let imageFile = null;
    let pdfFile = null;

    if (req.files) {
      if (req.files['image'] && req.files['image'].length > 0) {
        imageFile = req.files['image'][0];
      }
      if (req.files['pdf'] && req.files['pdf'].length > 0) {
        pdfFile = req.files['pdf'][0];
      }
    } else if (req.file) {
      imageFile = req.file;
    }

    if (imageFile) {
      console.log(`🖼️ [ADMIN_UPDATE_FILE] Processing image replacement: ${imageFile.originalname} (${imageFile.size} bytes)`);
      const uploadResult = await processUploadedFile(imageFile, req);
      if (uploadResult && uploadResult.url) {
        logo.image = uploadResult.url;
        logo.localFileName = imageFile.filename;
        if (uploadResult.publicId) {
          logo.cloudinaryPublicId = uploadResult.publicId;
        }
        // If a new image file is uploaded and no new Drive link is explicitly provided, clear driveFileId
        if (!driveFileId || !driveFileId.trim()) {
          logo.driveFileId = undefined;
        }
      }
    }

    if (pdfFile) {
      console.log(`📄 [ADMIN_UPDATE_FILE] Processing PDF replacement: ${pdfFile.originalname} (${pdfFile.size} bytes)`);
      const pdfUploadResult = await processUploadedFile(pdfFile, req);
      if (pdfUploadResult && pdfUploadResult.url) {
        logo.pdfUrl = pdfUploadResult.url;
      }
    } else if (driveFileId && driveFileId.trim()) {
      const cleanDriveId = driveFileId.trim();
      logo.pdfUrl = `https://drive.google.com/file/d/${cleanDriveId}/preview`;
      logo.driveFileId = cleanDriveId;
    }

    // Clear preview cache if new files are uploaded or a different Drive link is set
    if (imageFile || pdfFile || (driveFileId && driveFileId.trim() !== logo.driveFileId)) {
      const previewsDir = path.join(__dirname, '..', 'uploads', 'previews');
      const cachedPreviewPath = path.join(previewsDir, `preview-${logo._id.toString()}.png`);
      if (fs.existsSync(cachedPreviewPath)) {
        try {
          fs.unlinkSync(cachedPreviewPath);
          console.log(`🧹 [ADMIN_UPDATE_CACHE] Cleared cached preview for Logo ID ${logo._id}`);
        } catch (err) {
          console.error(`Failed to remove old preview cache file for logo ${logo._id}:`, err.message);
        }
      }
    }

    logo.updatedAt = Date.now();
    const savedLogo = await logo.save();

    console.log(`✅ [ADMIN_UPDATE_SUCCESS] Logo ${savedLogo.anonymousCode} (ID: ${savedLogo._id}) updated successfully in MongoDB.`);
    console.log(`✅ [ADMIN_UPDATE_RESULT] Saved Document:`, JSON.stringify(savedLogo, null, 2));

    if (!savedLogo) {
      return res.status(500).json({
        success: false,
        message: 'MongoDB save failed: returned null or empty document.'
      });
    }

    res.json({
      success: true,
      message: 'Participant information updated successfully.',
      logo: {
        id: savedLogo._id,
        anonymousCode: savedLogo.anonymousCode,
        title: savedLogo.title,
        description: savedLogo.description,
        image: `/api/public/logo-image/${savedLogo._id}`,
        rawImage: savedLogo.image,
        pdfUrl: savedLogo.pdfUrl,
        qrCode: savedLogo.qrCode,
        averageRating: savedLogo.averageRating,
        totalVotes: savedLogo.totalVotes,
        status: savedLogo.status,
        studentName: savedLogo.studentName,
        studentEmail: savedLogo.studentEmail,
        studentDepartment: savedLogo.studentDepartment,
        studentRollNumber: savedLogo.studentRollNumber,
        submittedAt: savedLogo.createdAt,
        updatedAt: savedLogo.updatedAt
      }
    });
  } catch (error) {
    console.error(`❌ [ADMIN_UPDATE_ERROR] Save failed for Logo ID ${req.params.id}:`, error.stack || error.message);
    return res.status(400).json({
      success: false,
      message: `Failed to save changes to MongoDB: ${error.message}`
    });
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

// @desc    Create New Logo Entry (Admin)
// @route   POST /api/admin/logos
// @access  Private (Admin only)
exports.createLogo = async (req, res, next) => {
  try {
    const {
      studentName,
      studentEmail,
      studentDepartment,
      studentRollNumber,
      title,
      description,
      driveFileId
    } = req.body;

    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ success: false, message: 'Student Name is required.' });
    }

    if (!studentEmail || !studentEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Email Address is required.' });
    }

    const emailCheck = validateEmailAddress(studentEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }
    const cleanEmail = emailCheck.cleanEmail;

    if (!studentDepartment || !studentDepartment.trim()) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    // Check image file upload
    const imageFiles = req.files && req.files['image'];
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'Logo image file is required.' });
    }
    const imageFile = imageFiles[0];

    // Max 10MB limit for image
    if (imageFile.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Logo image file size cannot exceed 10 MB.' });
    }

    const imageResult = await processUploadedFile(imageFile, req);
    if (!imageResult || !imageResult.url) {
      return res.status(400).json({ success: false, message: 'Failed to process uploaded logo image.' });
    }

    // Process PDF file if provided
    let pdfUrl = '';
    const pdfFiles = req.files && req.files['pdf'];
    if (pdfFiles && pdfFiles.length > 0) {
      const pdfFile = pdfFiles[0];
      if (pdfFile.size > 25 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'Submission PDF file size cannot exceed 25 MB.' });
      }
      const pdfResult = await processUploadedFile(pdfFile, req);
      if (pdfResult && pdfResult.url) {
        pdfUrl = pdfResult.url;
      }
    } else if (driveFileId && driveFileId.trim()) {
      const cleanDriveId = driveFileId.trim();
      pdfUrl = `https://drive.google.com/file/d/${cleanDriveId}/preview`;
    }

    // Auto-generate next sequential anonymous code (e.g., LOGO-27)
    const existingLogos = await Logo.find({}, 'anonymousCode');
    let maxNum = 0;
    existingLogos.forEach((l) => {
      const match = (l.anonymousCode || '').match(/LOGO-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const anonymousCode = `LOGO-${maxNum + 1}`;

    const logoTitle = (title && title.trim()) ? title.trim() : `${studentName.trim()}'s Design`;
    const logoDesc = (description && description.trim()) ? description.trim() : `Logo submission by ${studentName.trim()}`;

    const logo = await Logo.create({
      studentName: studentName.trim(),
      studentEmail: cleanEmail,
      studentDepartment: studentDepartment.trim(),
      studentRollNumber: (studentRollNumber || '').trim(),
      title: logoTitle,
      description: logoDesc,
      image: imageResult.url,
      cloudinaryPublicId: imageResult.publicId || '',
      pdfUrl,
      driveFileId: (driveFileId && driveFileId.trim()) ? driveFileId.trim() : undefined,
      localFileName: imageFile.filename,
      anonymousCode,
      status: 'approved'
    });

    // Generate unique QR code for voting
    const clientOrigin = getClientOrigin(req);
    const qrData = `${clientOrigin}/vote-logo/${logo._id}`;
    logo.qrCode = await QRCode.toDataURL(qrData);
    await logo.save();

    res.status(201).json({
      success: true,
      message: 'Logo added successfully.',
      logo: {
        id: logo._id,
        anonymousCode: logo.anonymousCode,
        title: logo.title,
        description: logo.description,
        image: `/api/public/logo-image/${logo._id}`,
        rawImage: logo.image,
        pdfUrl: logo.pdfUrl,
        qrCode: logo.qrCode,
        averageRating: logo.averageRating,
        totalVotes: logo.totalVotes,
        status: logo.status,
        studentName: logo.studentName,
        studentEmail: logo.studentEmail,
        studentDepartment: logo.studentDepartment,
        studentRollNumber: logo.studentRollNumber,
        submittedAt: logo.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset Competition (Delete all votes, ratings, voter tracking & reset logo stats)
// @route   POST /api/admin/reset-competition
// @access  Private (Admin only)
exports.resetCompetition = async (req, res, next) => {
  try {
    // 1. Delete all vote records
    await Vote.deleteMany({});

    // 2. Delete all duplicate attempt & voter tracking records
    await DuplicateAttempt.deleteMany({});

    // 3. Reset all logo statistics (totalVotes, averageRating, totalStarsSum)
    await Logo.updateMany(
      {},
      {
        $set: {
          totalVotes: 0,
          averageRating: 0,
          totalStarsSum: 0
        }
      }
    );

    // 4. Update CompetitionSetting if winner was declared
    const setting = await CompetitionSetting.findOne();
    if (setting) {
      setting.winnerLogoId = undefined;
      await setting.save();
    }

    res.json({
      success: true,
      message: 'Competition has been reset successfully.'
    });
  } catch (error) {
    next(error);
  }
};

