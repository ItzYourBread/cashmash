// models/GameHistory.js
const mongoose = require('mongoose');

const GameHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameType: { type: String, default: 'SlotsClassic' },
  bet: { type: Number, required: true },
  resultMatrix: { type: Array, required: true }, // array of columns of symbol names
  winningLines: { type: Array, default: [] },
  winnings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameHistory', GameHistorySchema);
