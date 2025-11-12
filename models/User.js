// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ----------------- SUBSCHEMAS -----------------
const depositSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  amountUSD: { type: Number, required: false, default: 0 },
  method: { type: String, enum: ['Bkash', 'Nagad', 'Upay', 'BinancePay', 'Crypto'], required: true },
  txnId: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

const withdrawSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['Bkash', 'Nagad', 'Upay', 'BinancePay'], required: true },
  
  // Fields needed to match the main Withdraw model (made them optional in the subschema)
  fullName: { type: String },
  contact: { type: String },
  userIdOrEmail: { type: String }, 
  
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  // NOTE: You previously had 'walletAddress' here, changed it to match new fields
  // walletAddress: { type: String }, 
  createdAt: { type: Date, default: Date.now }
});

const gameHistorySchema = new mongoose.Schema({
  gameType: { type: String, default: 'Aviator' },
  betAmount: { type: Number, required: true },
  multiplier: { type: Number, required: true },
  winAmount: { type: Number, required: true },
  result: { type: String, enum: ['Win', 'Loss'], required: true },
  playedAt: { type: Date, default: Date.now }
});

// ✅ NEW: Rakeback History Schema
const rakebackHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  wagered: { type: Number, required: true, default: 0 },
  percent: { type: Number, required: true, default: 0 },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
  creditedAt: { type: Date, default: Date.now },
  note: { type: String, default: 'Weekly rakeback credited' }
});

// ----------------- MAIN USER SCHEMA -----------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },

  chips: { type: Number, default: 0 },
  deposits: [depositSchema],
  withdrawals: [withdrawSchema],
  gameHistory: [gameHistorySchema],

  // ✅ Rakeback System Fields
  totalWagered: { type: Number, default: 0 },          // Tracks total bets for rakeback calculation
  rakebackPercent: { type: Number, default: 5 },       // 5% weekly rakeback (can be dynamic)
  rakebackBalance: { type: Number, default: 0 },       // Pending rakeback before credited
  rakebackHistory: [rakebackHistorySchema],            // Stores past weekly rakebacks

  otp: { type: String },
  otpExpiresAt: { type: Date },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  knownDevices: [
    {
      ip: String,
      userAgent: String,
      location: String,
      addedAt: { type: Date, default: Date.now }
    }
  ],

  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ----------------- PASSWORD HASHING -----------------
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ----------------- METHODS -----------------
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.addChips = async function (amount) {
  this.chips += amount;
  await this.save();
  return this.chips;
};

userSchema.methods.deductChips = async function (amount) {
  if (this.chips < amount) throw new Error('Insufficient Balance');
  this.chips -= amount;
  await this.save();
  return this.chips;
};

userSchema.methods.logGame = async function (data) {
  this.gameHistory.push(data);
  await this.save();
};

// ✅ NEW: Method to log rakeback automatically
userSchema.methods.addRakeback = async function (amount, weekStart, weekEnd, note = 'Weekly rakeback credited') {
  this.chips += amount;
  this.rakebackBalance = 0;
  this.totalWagered = 0; // Reset for next week
  this.rakebackHistory.push({ amount, weekStart, weekEnd, note });
  await this.save();
  return this.chips;
};

module.exports = mongoose.model('User', userSchema);
