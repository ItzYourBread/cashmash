const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String }, // optional now
  password: { type: String, required: true },
  chips: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },

  // For OTP & device security
  otp: { type: String },
  otpExpiresAt: { type: Date },
  knownDevices: [
    {
      ip: String,
      userAgent: String,
      location: String, // Optional if you use IP-based location service
      addedAt: { type: Date, default: Date.now }
    }
  ]
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
