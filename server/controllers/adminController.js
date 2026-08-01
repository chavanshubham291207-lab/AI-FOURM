const User = require('../models/User');
const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const CompetitionSetting = require('../models/CompetitionSetting');

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
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalVoters = await User.countDocuments({ role: 'voter' });
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
      const winnerLogo = await Logo.findById(setting.winnerLogoId).populate('studentId', 'name email rollNumber department');
      if (winnerLogo) {
        winner = {
          logoId: winnerLogo._id,
          anonymousCode: winnerLogo.anonymousCode,
          title: winnerLogo.title,
          image: winnerLogo.image,
          averageRating: winnerLogo.averageRating,
          totalVotes: winnerLogo.totalVotes,
          studentName: winnerLogo.studentId ? winnerLogo.studentId.name : 'Unknown',
          rollNumber: winnerLogo.studentId ? winnerLogo.studentId.rollNumber : '',
          department: winnerLogo.studentId ? winnerLogo.studentId.department : ''
        };
      }
    }

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalVoters,
        totalLogos,
        totalVotes,
        averageRating,
        competitionStatus: setting.phase,
        deadline: setting.deadline,
        winner
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get All Participants (Students)
// @route   GET /api/admin/participants
// @access  Private (Admin only)
exports.getParticipants = async (req, res, next) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });

    const studentIds = students.map((s) => s._id);
    const submissions = await Logo.find({ studentId: { $in: studentIds } });

    const submissionMap = {};
    submissions.forEach((sub) => {
      submissionMap[sub.studentId.toString()] = sub;
    });

    const participantData = students.map((student) => {
      const sub = submissionMap[student._id.toString()];
      return {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        branch: student.branch,
        registeredAt: student.createdAt,
        hasSubmitted: Boolean(sub),
        submission: sub
          ? {
              logoId: sub._id,
              anonymousCode: sub.anonymousCode,
              title: sub.title,
              image: sub.image,
              submittedAt: sub.createdAt
            }
          : null
      };
    });

    res.json({
      success: true,
      count: participantData.length,
      participants: participantData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Detailed Logo Submissions (mapped to Student Info)
// @route   GET /api/admin/logos
// @access  Private (Admin only)
exports.getLogoDetails = async (req, res, next) => {
  try {
    const logos = await Logo.find()
      .populate('studentId', 'name email rollNumber department branch')
      .sort({ averageRating: -1, totalVotes: -1 });

    const logoDetails = logos.map((logo) => ({
      id: logo._id,
      anonymousCode: logo.anonymousCode,
      title: logo.title,
      description: logo.description,
      image: logo.image,
      averageRating: logo.averageRating,
      totalVotes: logo.totalVotes,
      status: logo.status,
      submittedAt: logo.createdAt,
      student: logo.studentId
        ? {
            id: logo.studentId._id,
            name: logo.studentId.name,
            email: logo.studentId.email,
            rollNumber: logo.studentId.rollNumber,
            department: logo.studentId.department,
            branch: logo.studentId.branch
          }
        : { name: 'Unlinked Student', email: 'N/A' }
    }));

    res.json({
      success: true,
      count: logoDetails.length,
      logos: logoDetails
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
    const leaderboard = await Logo.find()
      .populate('studentId', 'name rollNumber department')
      .sort({ averageRating: -1, totalVotes: -1 });

    // Rating breakdown distribution (1 star, 2 stars, 3 stars, 4 stars, 5 stars)
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

    // Department distribution of entries
    const departmentStats = await User.aggregate([
      { $match: { role: 'student' } },
      {
        $group: {
          _id: '$department',
          studentCount: { $sum: 1 }
        }
      }
    ]);

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
        studentName: logo.studentId ? logo.studentId.name : 'Unknown',
        department: logo.studentId ? logo.studentId.department : ''
      })),
      analytics: {
        ratingDistribution,
        departmentStats
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
      const topLogo = await Logo.findOne().sort({ averageRating: -1, totalVotes: -1 });
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
      targetLogo = await Logo.findOne().sort({ averageRating: -1, totalVotes: -1 });
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

    const winnerWithStudent = await Logo.findById(targetLogo._id).populate('studentId', 'name rollNumber department email');

    res.json({
      success: true,
      message: `Winner announced! ${winnerWithStudent.anonymousCode} (${winnerWithStudent.title}) is the winner.`,
      winner: {
        logoId: winnerWithStudent._id,
        anonymousCode: winnerWithStudent.anonymousCode,
        title: winnerWithStudent.title,
        image: winnerWithStudent.image,
        averageRating: winnerWithStudent.averageRating,
        totalVotes: winnerWithStudent.totalVotes,
        studentName: winnerWithStudent.studentId ? winnerWithStudent.studentId.name : 'Unknown',
        rollNumber: winnerWithStudent.studentId ? winnerWithStudent.studentId.rollNumber : '',
        department: winnerWithStudent.studentId ? winnerWithStudent.studentId.department : ''
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
    const logos = await Logo.find()
      .populate('studentId', 'name email rollNumber department branch')
      .sort({ averageRating: -1, totalVotes: -1 });

    const csvHeaders = 'Rank,Entry ID,Logo Title,Average Rating,Total Votes,Student Name,Roll Number,Department,Branch,Student Email\n';
    const csvRows = logos.map((logo, index) => {
      const student = logo.studentId || {};
      const cleanTitle = `"${(logo.title || '').replace(/"/g, '""')}"`;
      const cleanName = `"${(student.name || '').replace(/"/g, '""')}"`;
      return `${index + 1},${logo.anonymousCode},${cleanTitle},${logo.averageRating},${logo.totalVotes},${cleanName},${student.rollNumber || ''},${student.department || ''},${student.branch || ''},${student.email || ''}`;
    }).join('\n');

    const csvContent = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ai_forum_logo_competition_results.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};
