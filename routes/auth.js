const express = require('express');
const User = require('../models/User');
const { COUNTRY_CODES } = require('../models/User')
const { generateOTP, otpExpired } = require('../utils/otp');
const transporter = require('../config/nodemailer');
const geoip = require('geoip-lite');
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
   🔹 GET ROUTES
   ===================================== */
router.get('/register', isNotLoggedIn, async (req, res) => {

  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(ip);

  // If multiple IPs, take the first one
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();

  // Lookup country
  const geo = geoip.lookup(ip);
  let autoCountry = 'US'; // fallback
  if (geo && geo.country) autoCountry = geo.country;

  res.render('register', { currentPage: 'register', COUNTRY_CODES, autoCountry });
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
// POST Register
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, country } = req.body;
    username = username.trim().toLowerCase();
    email = email.trim().toLowerCase();

    if (!COUNTRY_CODES.includes(country))
      return res.status(400).json({ message: 'Invalid country selection.' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Username already taken.' });

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already registered.' });

    const newUser = new User({ username, email, password, country });
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
          subject: '🔐 Your CashMash Login Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 450px; margin: auto; border: 1px solid #333; border-radius: 12px; overflow: hidden; background-color: #000; color: #f0f0f0; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);">
                
                <div style="background-color: #f5c542; padding: 15px 25px; text-align: center;">
                    <h1 style="color: #000; margin: 0; font-size: 24px;">CASHMASH</h1>
                </div>
                
                <div style="padding: 25px; text-align: center;">
                    <h2 style="color: #f5c542; margin-top: 0; font-size: 20px;">Login Verification Required</h2>
                    <p style="font-size: 14px; line-height: 1.5;">
                        We detected a login attempt from a new device or location. Please use the code below to verify your identity:
                    </p>
                    
                    <div style="font-size: 32px; letter-spacing: 5px; color: #000; background-color: #f5c542; padding: 15px 20px; margin: 25px auto; width: fit-content; border-radius: 8px; font-weight: bold;">
                        ${otp}
                    </div>
                    
                    <p style="font-size: 14px; color: #aaa; margin-top: 20px;">
                        This code is valid for <b>5 minutes</b>. Do not share this code with anyone.
                    </p>
                </div>

                <div style="background-color: #111; padding: 10px 25px; text-align: center; font-size: 12px; color: #666;">
                    <p style="margin: 0;">If you did not request this, please ignore it.</p>
                </div>
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
  // We'll rename 'email' to 'identifier' to handle both username and email
  const { identifier, otp } = req.body;
  const userAgent = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  // 🌟 Validate input immediately
  if (!identifier || !otp) {
    return res.status(400).send('Missing identifier (username/email) or OTP in verification request.');
  }

  try {
    let user;
    const cleanIdentifier = identifier.trim().toLowerCase();

    // 🔍 Step 1: Search for the user using either email or username
    if (cleanIdentifier.includes('@')) {
      // Search by email
      user = await User.findOne({ email: cleanIdentifier });
    } else {
      // Search by username
      user = await User.findOne({ username: cleanIdentifier });
    }

    // 🔍 Step 2: Check for user existence
    if (!user) return res.status(404).send('User not found.');

    // Step 3: Check OTP status
    if (otpExpired(user)) return res.status(400).send('OTP expired.');
    if (user.otp !== otp) return res.status(401).send('Invalid OTP.');

    // Step 4: Verification successful - Save new device and clear OTP
    user.knownDevices.push({ ip, userAgent });
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // Step 5: Log user in
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
