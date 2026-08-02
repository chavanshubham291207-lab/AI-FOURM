const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null
    },
    qrCode: {
      type: String,
      default: ''
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
    driveFileId: {
      type: String,
      sparse: true,
      unique: true,
      default: null
    },
    localFileName: {
      type: String,
      sparse: true,
      unique: true,
      default: null
    },
    studentName: {
      type: String,
      default: ''
    },
    studentEmail: {
      type: String,
      default: ''
    },
    studentDepartment: {
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
