require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Logo = require('./models/Logo');
const Vote = require('./models/Vote');
const CompetitionSetting = require('./models/CompetitionSetting');

const seedData = async () => {
  try {
    await connectDB();
    console.log('Connecting to database...');

    // Reset collections
    await User.deleteMany({ role: { $in: ['student', 'voter'] } });
    await Logo.deleteMany({});
    await Vote.deleteMany({});
    await CompetitionSetting.deleteMany({});

    console.log('Cleared database collections.');

    // Initialize Default Competition Setting
    await CompetitionSetting.create({
      phase: 'REGISTRATION',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    console.log('✅ Competition initialized in REGISTRATION phase.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
