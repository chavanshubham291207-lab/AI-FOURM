const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, WEBP, SVG) are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Helper function to process uploaded file (Cloudinary if available, local path fallback)
const processUploadedFile = async (file, req) => {
  if (!file) return null;

  if (isCloudinaryConfigured()) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'ai_forum_logos',
        resource_type: 'auto'
      });

      // Cleanup local temp file after Cloudinary upload
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      console.error('Cloudinary upload error, using local fallback:', error.message);
    }
  }

  // Fallback to local server static URL
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  const localUrl = `${protocol}://${host}/uploads/${file.filename}`;

  return {
    url: localUrl,
    publicId: file.filename
  };
};

// File filter for multi-field (image + optional pdf) uploads
const logoAndPdfFileFilter = (req, file, cb) => {
  if (file.fieldname === 'image') {
    const allowedTypes = /jpeg|jpg|png|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Only image files (PNG, JPG, JPEG, WebP) are allowed for the logo image!'));
    }
  } else if (file.fieldname === 'pdf') {
    const extname = path.extname(file.originalname).toLowerCase() === '.pdf';
    const mimetype = file.mimetype === 'application/pdf' || file.mimetype.includes('pdf');
    if (extname || mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Only PDF documents are allowed for submission PDF!'));
    }
  }
  cb(null, true);
};

const uploadLogoAndPdf = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: logoAndPdfFileFilter
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]);

module.exports = { upload, uploadLogoAndPdf, processUploadedFile };
