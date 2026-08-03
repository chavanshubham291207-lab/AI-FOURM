require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('../server/config/db');
const CompetitionSetting = require('../server/models/CompetitionSetting');
const { autoImportJsonLogos } = require('../server/services/logoImportService');
const errorHandler = require('../server/middleware/errorHandler');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure DB connection on serverless invocation
let isInitialized = false;
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await connectDB();
      const VoteModel = require('../server/models/Vote');
      await VoteModel.collection.dropIndex('voterId_1').catch(() => {});
      await VoteModel.collection.dropIndex('email_1').catch(() => {});
      await VoteModel.syncIndexes().catch(() => {});

      let setting = await CompetitionSetting.findOne();
      if (!setting) {
        await CompetitionSetting.create({
          phase: 'VOTING',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
      await autoImportJsonLogos();
      isInitialized = true;
    } catch (err) {
      console.error('Vercel DB Init Error:', err);
    }
  }
  next();
});

// Routes
app.use('/api/auth', require('../server/routes/authRoutes'));
app.use('/api/public', require('../server/routes/publicRoutes'));
app.use('/api/admin', require('../server/routes/adminRoutes'));
app.use('/api/ai', require('../server/routes/aiRoutes'));

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI Forum Backend API Running on Vercel',
    timestamp: new Date()
  });
});

app.use(errorHandler);

module.exports = app;
