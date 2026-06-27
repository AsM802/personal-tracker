const mongoose = require('mongoose');

const habitDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true }, // 0-11
  year: { type: Number, required: true },
  habits: { type: Array, default: [] },
  notes: { type: Object, default: {} },
}, { timestamps: true });

habitDataSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('HabitData', habitDataSchema);
