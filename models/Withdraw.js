// models/Withdraw.js
const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true }, // Bkash, Nagad, Upay, BinancePay, etc.
  fullName: { type: String, required: true },
  contact: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Withdraw', withdrawSchema);
