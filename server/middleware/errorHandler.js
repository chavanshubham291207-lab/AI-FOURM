const errorHandler = (err, req, res, next) => {
  console.error('⚠️ [API ERROR LOG]:', err.stack || err.message || err);

  // Multer File Upload Errors
  if (err.name === 'MulterError' || err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File size limit exceeded. Please choose a smaller file.'
      : err.message || 'File upload validation failed.';
    return res.status(400).json({ success: false, message });
  }

  // File Filter rejection errors
  if (err.message && (err.message.includes('Only image files') || err.message.includes('Only PDF documents'))) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    return res.status(404).json({ success: false, message });
  }

  // Mongoose duplicate key (E11000)
  if (err.code === 11000) {
    const key = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate ${key} entered. Please use a unique value.`;
    return res.status(400).json({ success: false, message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
};

module.exports = errorHandler;
