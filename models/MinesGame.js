// models/MinesGame.js
const mongoose = require('mongoose');

const MinesGameSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bet: { type: Number, required: true },
  mineCount: { type: Number, required: true },
  mines: [Number], // mine positions
  revealed: [Number],
  cashedOut: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('MinesGame', MinesGameSchema);
