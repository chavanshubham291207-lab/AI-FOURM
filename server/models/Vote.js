const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    logoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logo',
      required: true
    },
    voterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
    },
    rating: {
      type: Number,
      required: false,
      default: 5
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

// Prevent duplicate voting: 1 email can vote for 1 logo only once
voteSchema.index({ logoId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
