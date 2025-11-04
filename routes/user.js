// routes/dashboard.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

// --- CONFIGURATION ---
const PAGE_SIZE = 10; // Number of items per page

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}


// Dashboard Route
router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    const PAGE_SIZE = 10;
    const user = await User.findById(req.user._id)
      .populate('deposits')
      .populate('withdrawals')
      .populate('gameHistory');

    const activeSection = req.query.section || 'statistics';
    const currentPage = parseInt(req.query.page) || 1;

    // --- Pagination Helper ---
    const paginate = (arr) => {
      const total = arr.length;
      const pages = Math.ceil(total / PAGE_SIZE);
      const start = (currentPage - 1) * PAGE_SIZE;
      return { paginated: arr.slice(start, start + PAGE_SIZE), total, pages };
    };

    const { paginated: paginatedDeposits, pages: depositPages } = paginate(user.deposits);
    const { paginated: paginatedWithdrawals, pages: withdrawalPages } = paginate(user.withdrawals);
    const { paginated: paginatedGameHistory, pages: historyPages } = paginate(user.gameHistory);
    const { paginated: paginatedRakeback, pages: rakePages } =
      paginate((user.rakebackHistory || []).sort((a, b) => new Date(b.creditedAt) - new Date(a.creditedAt)));

    // --- Process Rakeback for Display ---
    const rakebackDisplay = paginatedRakeback.map(rb => ({
      date: rb.creditedAt ? new Date(rb.creditedAt) : new Date(),
      weeklyWagered: rb.wagered || 0,
      percent: rb.percent || user.rakebackPercent || 5,
      rakeback: rb.amount || 0
    }));

    // --- Render Dashboard ---
    res.render('dashboard', {
      user,
      activeSection,
      currentPage,

      // Deposits
      deposits: paginatedDeposits,
      depositPages,
      depositPage: currentPage,

      // Withdrawals
      withdrawals: paginatedWithdrawals,
      withdrawalPages,
      withdrawalPage: currentPage,

      // Game History
      gameHistory: paginatedGameHistory,
      historyPages,
      historyPage: currentPage,

      // Rakeback
      rakebackHistory: rakebackDisplay,
      rakePages,
      rakePage: currentPage
    });

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

    // Note: Mongoose pre('save') middleware should handle hashing the password
    user.password = newPassword; 
    await user.save(); 
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