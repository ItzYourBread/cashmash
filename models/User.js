// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { COUNTRY_CODES } = require('../config/countries')

// ----------------- SUBSCHEMAS -----------------
const depositSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  amountBDT: { type: Number, required: false },
  method: { type: String, required: true }, // Bkash, Nagad, Upay, etc.
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
  method: { type: String, enum: ['Bkash', 'Nagad', 'Upay', 'BinancePay', 'Crypto'], required: true },

  // Fields needed to match the main Withdraw model (made them optional in the subschema)
  fullName: { type: String },
  contact: { type: String },
  userIdOrEmail: { type: String },
  WalletAddress: { type: String },

  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
    default: 'Pending'
  },
  note: { type: String, default: "Nothing for Note" },
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
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  phone: { type: String, required: false },
  country: {
    type: String,
    required: false,
    enum: COUNTRY_CODES
  },
  address: { type: String, required: false },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },

  balance: { type: Number, default: 0 },
  deposits: [depositSchema],
  withdrawals: [withdrawSchema],
  gameHistory: [gameHistorySchema],

  // ✅ Rakeback System Fields
  totalWagered: { type: Number, default: 0 },          // Tracks total bets for rakeback calculation
  rakebackPercent: { type: Number, default: 5 },       // 5% weekly rakeback (can be dynamic)
  rakebackBalance: { type: Number, default: 0 },       // Pending rakeback before credited
  rakebackHistory: [rakebackHistorySchema],            // Stores past weekly rakebacks

  // ✅ Referral System Fields
  referralCode: { type: String, unique: true, sparse: true }, // The unique code (e.g., "REF123")
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The User who invited this person
  referralCommissionRate: { type: Number, default: 5 }, // 5% commission on deposits
  totalReferralEarnings: { type: Number, default: 0 }, // Total stats
  referralCount: { type: Number, default: 0 }, // Total users invited

  referralHistory: [{
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    date: { type: Date, default: Date.now }
  }],

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


// ----------------- AUTO-GENERATE REFERRAL CODE -----------------
userSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    this.referralCode = Math.floor(1000000 + Math.random() * 9000000).toString();
  }
  
  next();
});

// ----------------- METHODS -----------------
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.addChips = async function (amount) {
  this.balance += amount;
  await this.save();
  return this.balance;
};

userSchema.methods.deductChips = async function (amount) {
  if (this.balance < amount) throw new Error('Insufficient Balance');
  this.balance -= amount;
  await this.save();
  return this.balance;
};

userSchema.methods.logGame = async function (data) {
  this.gameHistory.push(data);
  await this.save();
};

// ✅ NEW: Method to log rakeback automatically
userSchema.methods.addRakeback = async function (amount, weekStart, weekEnd, note = 'Weekly rakeback credited') {
  this.balance += amount;
  this.rakebackBalance = 0;
  this.totalWagered = 0; // Reset for next week
  this.rakebackHistory.push({ amount, weekStart, weekEnd, note });
  await this.save();
  return this.balance;
};

module.exports = mongoose.model('User', userSchema);
