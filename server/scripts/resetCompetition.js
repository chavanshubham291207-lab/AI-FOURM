require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const dns = require('dns');

// DNS SRV Resolution fallback for MongoDB Atlas
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const Logo = require('../models/Logo');
const Vote = require('../models/Vote');
const DuplicateAttempt = require('../models/DuplicateAttempt');
const CompetitionSetting = require('../models/CompetitionSetting');
const { MAX_VOTES } = require('../config/constants');

let uri = process.env.MONGO_URI || 'mongodb+srv://AIFOURM:jspm%402026@cluster00.vujlpwx.mongodb.net/ai-forum?retryWrites=true&w=majority&appName=Cluster00';
if (uri.includes(':jspm@2026@')) {
  uri = uri.replace(':jspm@2026@', ':jspm%402026@');
}

async function resetCompetition() {
  console.log('🔄 Connecting to MongoDB Atlas for Production Competition Reset...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB Connected.');

    // 1. Delete all test votes
    const deletedVotes = await Vote.deleteMany({});
    console.log(`🧹 Deleted ${deletedVotes.deletedCount} test votes from 'votes' collection.`);

    // 2. Clear duplicate attempt tracking records
    const deletedDuplicates = await DuplicateAttempt.deleteMany({});
    console.log(`🧹 Deleted ${deletedDuplicates.deletedCount} duplicate tracking records from 'duplicateattempts' collection.`);

    // 3. Reset stats for all candidate logos while preserving logo data & student info
    const logoResetResult = await Logo.updateMany(
      {},
      {
        $set: {
          totalVotes: 0,
          totalStarsSum: 0,
          averageRating: 0
        }
      }
    );
    console.log(`✨ Reset statistics for ${logoResetResult.modifiedCount} candidate logos.`);

    // 4. Reset competition settings (Voting active, 1000 votes remaining)
    let setting = await CompetitionSetting.findOne();
    if (!setting) {
      setting = new CompetitionSetting();
    }
    setting.phase = 'VOTING';
    setting.remainingVotesLimit = MAX_VOTES;
    setting.winnerLogoId = null;
    setting.deadline = null;
    setting.announcementDate = null;
    await setting.save();
    console.log(`🏆 Competition Phase set to 'VOTING' with Remaining Votes Limit = ${MAX_VOTES}.`);

    // 5. Verification Check
    const remainingLogos = await Logo.countDocuments();
    const remainingVotes = await Vote.countDocuments();
    const remainingDupes = await DuplicateAttempt.countDocuments();

    console.log('\n==================================================');
    console.log('🎉 PRODUCTION COMPETITION RESET COMPLETE');
    console.log('==================================================');
    console.log(`- Candidate Logos Preserved: ${remainingLogos}`);
    console.log(`- Total Test Votes Remaining: ${remainingVotes}`);
    console.log(`- Duplicate Tracking Records: ${remainingDupes}`);
    console.log(`- Remaining Quota Available: ${setting.remainingVotesLimit} / ${MAX_VOTES}`);
    console.log(`- Active Competition Phase: ${setting.phase}`);
    console.log('==================================================\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB Atlas.');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Reset Error: ${error.message}`);
    process.exit(1);
  }
}

resetCompetition();
