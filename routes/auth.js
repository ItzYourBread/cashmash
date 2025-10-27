const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const { generateOTP, otpExpired } = require('../utils/otp');
const nodemailer = require('nodemailer');
const router = express.Router();

/* =====================================
   🔹 EMAIL TRANSPORTER (Nodemailer)
   ===================================== */
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use custom SMTP in production
  auth: {
    user: process.env.SMTP_EMAIL, // e.g. "arifsatifyfilms@gmail.com"
    pass: process.env.SMTP_PASS,  // Gmail App Password (NOT normal password)
  },
});

/* =====================================
   🔹 GET ROUTES
   ===================================== */

// Render Register Page
router.get('/register', (req, res) => {
  res.render('register', { currentPage: 'register' });
});

// Render Login Page
router.get('/login', (req, res) => {
  res.render('login', { currentPage: 'login' });
});

/* =====================================
   🔹 REGISTER (POST)
   ===================================== */
router.post('/register', async (req, res) => {
  const { username, email, phone, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ message: 'Email already registered. Please log in.' });

    const newUser = new User({
      username,
      email,
      phone: phone || null,
      password,
    });

    await newUser.save();
    res
      .status(200)
      .json({ message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ message: 'Something went wrong during registration.' });
  }
});

/* =====================================
   🔹 LOGIN (Step 1)
   ===================================== */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password.' });

    // Check if known device
    const knownDevice = user.knownDevices.find(
      (d) => d.ip === ip && d.userAgent === userAgent
    );

    if (!knownDevice) {
      // Generate OTP for unrecognized device
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 min
      await user.save();

      // Send OTP via email
      try {
        await transporter.sendMail({
          from: `"CashMash Security" <${process.env.SMTP_EMAIL}>`,
          to: user.email,
          subject: 'Your CashMash Login OTP',
          html: `
            <div style="font-family:sans-serif;padding:20px;background:#00145a;color:white;border-radius:8px;">
              <h2 style="color:#f5c542;">CashMash Login Verification</h2>
              <p>We detected a login attempt from a new device or location.</p>
              <p>Please use the following OTP to verify your identity:</p>
              <div style="font-size:24px;letter-spacing:3px;color:#f5c542;margin:20px 0;">
                <b>${otp}</b>
              </div>
              <p>This code will expire in <b>5 minutes</b>.</p>
              <p>If this wasn’t you, please ignore this email.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error('Failed to send OTP email:', mailErr);
      }

      return res.status(200).json({
        message: 'New device detected. OTP sent to your email.',
        otpRequired: true,
      });
    }

    // Known device → log in instantly
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
   🔹 VERIFY OTP (Step 2)
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

    // Mark device as trusted
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
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;