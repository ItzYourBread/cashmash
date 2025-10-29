// models/Deposit.js
const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  method: { type: String, required: true }, // Bkash, Nagad, Upay, etc.
  txnId: { type: String, required: true },
  agentName: { type: String },   // Store agent full_name
  agentContact: { type: String }, // Store agent contact number
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Deposit', depositSchema);
