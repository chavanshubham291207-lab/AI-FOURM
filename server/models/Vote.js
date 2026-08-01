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
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    }
  },
  { timestamps: true }
);

// Prevent duplicate voting: 1 voter can vote 1 logo only once
voteSchema.index({ logoId: 1, voterId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
