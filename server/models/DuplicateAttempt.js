const mongoose = require('mongoose');

const duplicateAttemptSchema = new mongoose.Schema(
  {
    voterId: {
      type: String,
      required: true
    },
    ipAddress: {
      type: String,
      default: 'Unknown'
    },
    fingerprint: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    reason: {
      type: String,
      default: 'Duplicate vote attempt'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DuplicateAttempt', duplicateAttemptSchema);
