// models/Withdraw.js
const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  amountUSD: { type: Number, required: false, default: 0 },
  method: { 
      type: String, 
      enum: ['Bkash', 'Nagad', 'Upay', 'BinancePay'], // Use the same enums as deposits
      required: true 
  },
  
  // E-Wallet Specific Fields - Conditionally Required
  fullName: { 
      type: String, 
      required: function() {
          // This field is ONLY required if the method is Bkash, Nagad, or Upay
          return ['Bkash', 'Nagad', 'Upay'].includes(this.method);
      }
  },
  contact: { 
      type: String, 
      required: function() {
          // This field is ONLY required if the method is Bkash, Nagad, or Upay
          return ['Bkash', 'Nagad', 'Upay'].includes(this.method);
      }
  },

  // Crypto Specific Field
  userIdOrEmail: { 
      type: String, 
      required: function() {
          // This field is ONLY required if the method is BinancePay
          return this.method === 'BinancePay';
      }
  },
  
  status: { 
    type: String, 
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Withdraw', withdrawSchema);