// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ----------------- SUBSCHEMAS -----------------
const depositSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  method: { type: String, default: 'Binance Pay' },
  txnId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const withdrawSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled'], 
    default: 'Pending' 
  },
  method: { type: String, default: 'Binance Pay' },
  walletAddress: { type: String },
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

// ----------------- MAIN USER SCHEMA -----------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },

  chips: { type: Number, default: 0 },
  deposits: [depositSchema],
  withdrawals: [withdrawSchema],
  gameHistory: [gameHistorySchema],

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
  if (this.chips < amount) throw new Error('Insufficient chips');
  this.chips -= amount;
  await this.save();
  return this.chips;
};

userSchema.methods.logGame = async function (data) {
  this.gameHistory.push(data);
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
