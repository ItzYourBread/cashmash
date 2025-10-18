const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Register
router.get('/register', (req, res) => res.render('register'));
router.post('/register', async (req, res) => {
  const { username, email, phone, password } = req.body;

  try {
    // Check if email or phone already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.send('Email or phone number already registered.');
    }

    // Create new user
    const user = new User({ username, email, phone, password });
    await user.save();

    // Redirect to login
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.send('Something went wrong. Please try again.');
  }
});

// Login
router.get('/login', (req, res) => res.render('login'));
router.post('/login', passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login'
}));

// Logout
router.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

module.exports = router;
