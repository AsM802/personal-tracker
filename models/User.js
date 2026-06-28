const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  displayName: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  coins: { type: Number, default: 0 },
  motto: { type: String, default: '"Every dog has a day. This dog\'s day hasn\'t come yet. So this dog works until it does."' },
  rules: [{ type: String }],
  medals: {
    bronze: { type: Number, default: 0 },
    silver: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    honor: { type: Number, default: 0 }
  },
  darkMode: { type: Boolean, default: false },
  soundEnabled: { type: Boolean, default: true },
  achievements: { type: Object, default: {} },
  rewards: [{ 
    id: String, 
    name: String, 
    emoji: String, 
    cost: Number,
    requiredMedals: {
      bronze: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      honor: { type: Number, default: 0 }
    },
    redeemed: { type: Boolean, default: false }, 
    redeemedDate: Date 
  }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  examScores: [{
    testName: String,
    score: Number,
    maxScore: Number,
    accuracy: Number,
    date: { type: Date, default: Date.now }
  }],
  wishlistItems: [{
    title: String,
    targetAmount: Number,
    currentAmount: Number,
    category: String
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
