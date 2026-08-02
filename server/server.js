require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

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

// Ensure uploads directory exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Health check endpoints
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AI Forum Backend API Running',
    timestamp: new Date()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Forum Logo Competition API is running smoothly',
    timestamp: new Date()
  });
});

// Serve frontend client build in production if available
const clientDistPath = path.join(__dirname, '../client/dist');
const indexPath = path.join(clientDistPath, 'index.html');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Handle React SPA Client-side Routing & Backend Fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Standalone Backend fallback response
  res.status(200).json({
    success: true,
    message: 'AI Forum Backend Running'
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
