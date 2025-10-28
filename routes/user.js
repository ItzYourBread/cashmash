// routes/dashboard.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Dashboard
router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('deposits')
      .populate('withdrawals')
      .populate('gameHistory');
      
    res.render('dashboard', { user, currentPage: 'dashboard' });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

// Update phone
router.post('/account/update', ensureAuth, async (req, res) => {
  try {
    const { phone, password, confirm } = req.body;
    const user = await User.findById(req.user._id);

    if (phone) user.phone = phone;

    if (password) {
      if (password !== confirm)
        return res.send('<script>alert("Passwords do not match");window.history.back();</script>');
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.send('<script>alert("Account updated successfully!");window.location.href="/dashboard";</script>');
  } catch (err) {
    console.error(err);
    res.send('<script>alert("Error updating account.");window.history.back();</script>');
  }
});

// ----------------- PASSWORD CHANGE -----------------
router.post('/change-password', ensureAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).send('User not found');
    if (newPassword !== confirmPassword)
      return res.status(400).send('Passwords do not match');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).send('Current password is incorrect');

    user.password = newPassword; // <-- important
    await user.save(); // triggers pre('save') → password gets hashed
    res.redirect('/dashboard?message=Password+changed+successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// Delete Account
router.post('/account/delete', ensureAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    req.logout(() => res.redirect('/register'));
  } catch (err) {
    console.error(err);
    res.send('<script>alert("Error deleting account.");window.history.back();</script>');
  }
});

module.exports = router;
