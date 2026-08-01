require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const CompetitionSetting = require('./models/CompetitionSetting');

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/voter', require('./routes/voterRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AI Forum Logo Competition API is running smoothly',
    timestamp: new Date()
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server ONLY after successful MongoDB Connection
const startServer = async () => {
  await connectDB();

  try {
    let setting = await CompetitionSetting.findOne();
    if (!setting) {
      await CompetitionSetting.create({
        phase: 'REGISTRATION',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      console.log('📌 Competition Settings initialized in MongoDB.');
    }
  } catch (err) {
    console.error('Error initializing competition setting:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📌 Admin Email: ${process.env.ADMIN_EMAIL || 'admin@aiforum.com'}`);
  });
};

startServer();
