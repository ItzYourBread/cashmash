const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { generateOTP, otpExpired } = require('../utils/otp');
const nodemailer = require('nodemailer');
const router = express.Router();

const otpEnable = false; // ⬅️ Set to true if you want OTP login enabled

/* =====================================
   ✅ AUTHENTICATION CHECK MIDDLEWARE
   ===================================== */
const isNotLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  next();
};

/* =====================================
   🔹 EMAIL TRANSPORTER (Nodemailer)
   ===================================== */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

/* =====================================
   🔹 GET ROUTES
   ===================================== */
router.get('/register', isNotLoggedIn, (req, res) => {
  res.render('register', { currentPage: 'register' });
});

router.get('/login', isNotLoggedIn, (req, res) => {
  res.render('login', { currentPage: 'login' });
});

/* =====================================
   🔹 USERNAME AVAILABILITY CHECK (AJAX)
   ===================================== */
router.get('/check-username', async (req, res) => {
  try {
    const username = req.query.username?.trim().toLowerCase();
    if (!username) return res.json({ available: false });
    const existing = await User.findOne({ username });
    res.json({ available: !existing });
  } catch (err) {
    console.error('Username Check Error:', err);
    res.status(500).json({ available: false });
  }
});

/* =====================================
   🔹 REGISTER (POST)
   ===================================== */
router.post('/register', async (req, res) => {
  try {
    let { username, email, phone, password } = req.body;

    // Clean input
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    // Validate password length
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });

    // Check username availability
    const existingUsername = await User.findOne({ username });
    if (existingUsername)
      return res.status(400).json({ message: 'Username already taken. Please choose another.' });

    // Check email availability
    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: 'Email already registered. Please log in.' });

    // Create user
    const newUser = new User({
      username,
      email,
      phone: phone || null,
      password,
    });

    await newUser.save();
    res.status(200).json({ message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Something went wrong during registration.' });
  }
});

/* =====================================
   🔹 LOGIN (POST)
   ===================================== */
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // email or username
  const userAgent = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    let user;
    if (identifier.includes('@')) {
      user = await User.findOne({ email: identifier.trim().toLowerCase() });
    } else {
      user = await User.findOne({ username: identifier.trim().toLowerCase() });
    }

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password.' });

    // OTP Disabled → login directly
    if (!otpEnable) {
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: 'Login error.' });
        return res.status(200).json({ message: 'Login successful.', otpRequired: false });
      });
      return;
    }

    // OTP Enabled → new device check
    const knownDevice = user.knownDevices.find(
      (d) => d.ip === ip && d.userAgent === userAgent
    );

    if (!knownDevice) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 min
      await user.save();

      try {
        await transporter.sendMail({
          from: `"CashMash Security" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: 'Your CashMash Login OTP',
          html: `
            <div style="font-family:sans-serif;padding:20px;background:#000820;color:white;border-radius:8px;">
              <h2 style="color:#f5c542;">CashMash Login Verification</h2>
              <p>We detected a login attempt from a new device.</p>
              <p>Use this OTP to verify your identity:</p>
              <div style="font-size:24px;letter-spacing:3px;color:#f5c542;margin:20px 0;">
                <b>${otp}</b>
              </div>
              <p>This code expires in <b>5 minutes</b>.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error('OTP email failed:', mailErr);
      }

      return res.status(200).json({
        message: 'New device detected. OTP sent to your email.',
        otpRequired: true,
      });
    }

    // Known device → login directly
    req.login(user, (err) => {
      if (err) return res.status(500).json({ message: 'Login error.' });
      res.status(200).json({ message: 'Login successful.', otpRequired: false });
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Something went wrong during login.' });
  }
});

/* =====================================
   🔹 VERIFY OTP (POST)
   ===================================== */
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send('User not found.');

    if (otpExpired(user)) return res.status(400).send('OTP expired.');
    if (user.otp !== otp) return res.status(401).send('Invalid OTP.');

    user.knownDevices.push({ ip, userAgent });
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    req.login(user, (err) => {
      if (err) return res.status(500).send('Login error.');
      res.status(200).send('OTP verified and login successful.');
    });
  } catch (err) {
    console.error('OTP Verification Error:', err);
    res.status(500).send('Something went wrong while verifying OTP.');
  }
});

/* =====================================
   🔹 LOGOUT
   ===================================== */
router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

module.exports = router;
