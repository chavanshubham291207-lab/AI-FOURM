const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // Ensures only 1 logo per student at the database level!
    },
    anonymousCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Logo title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Logo description is required'],
      trim: true
    },
    image: {
      type: String,
      required: [true, 'Logo image is required']
    },
    cloudinaryPublicId: {
      type: String,
      default: ''
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalVotes: {
      type: Number,
      default: 0
    },
    totalStarsSum: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'winner'],
      default: 'approved'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Logo', logoSchema);
