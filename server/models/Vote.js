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
    }
  },
  { timestamps: true }
);

// Prevent duplicate voting: 1 voterId per logo, and 1 email per logo
voteSchema.index({ logoId: 1, voterId: 1 }, { unique: true });
voteSchema.index({ logoId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
