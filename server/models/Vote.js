const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    logoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logo',
      required: true
    },
    voterId: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    voterName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    department: {
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
    }
  },
  { timestamps: true }
);

// Enforce 1 vote per voterId and 1 vote per email overall across the competition
voteSchema.index({ voterId: 1 }, { unique: true });
voteSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
