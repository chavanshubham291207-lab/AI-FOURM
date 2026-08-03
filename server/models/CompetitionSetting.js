const mongoose = require('mongoose');
const { MAX_VOTES } = require('../config/constants');

const competitionSettingSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      enum: ['REGISTRATION', 'VOTING', 'CLOSED', 'WINNER_ANNOUNCED'],
      default: 'REGISTRATION'
    },
    winnerLogoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Logo',
      default: null
    },
    deadline: {
      type: Date,
      default: null
    },
    announcementDate: {
      type: Date,
      default: null
    },
    remainingVotesLimit: {
      type: Number,
      default: MAX_VOTES
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompetitionSetting', competitionSettingSchema);
