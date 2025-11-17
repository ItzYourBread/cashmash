// routes/dashboard.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

// --- CONFIGURATION ---
const PAGE_SIZE = 10; // Number of items per page

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // User is authenticated, proceed to the next middleware/route handler
    return next();
  } else {
    // User is NOT authenticated, redirect to the login page
    return res.redirect('/login');
  }
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

    // --- Force consistent sorting (newest first) ---
    const sortByDateDesc = (arr, field = 'createdAt') =>
      [...(arr || [])].sort((a, b) => new Date(b[field]) - new Date(a[field]));

    const sortedDeposits = sortByDateDesc(user.deposits, 'createdAt');
    const sortedWithdrawals = sortByDateDesc(user.withdrawals, 'createdAt');
    const sortedHistory = sortByDateDesc(user.gameHistory, 'playedAt');
    const sortedRakeback = sortByDateDesc(user.rakebackHistory || [], 'creditedAt');

    // --- Pagination Helper ---
    const paginate = (arr) => {
      const total = arr.length;
      const pages = Math.ceil(total / PAGE_SIZE);
      const start = (currentPage - 1) * PAGE_SIZE;
      return { paginated: arr.slice(start, start + PAGE_SIZE), total, pages };
    };

    const { paginated: paginatedDeposits, pages: depositPages } = paginate(sortedDeposits);
    const { paginated: paginatedWithdrawals, pages: withdrawalPages } = paginate(sortedWithdrawals);
    const { paginated: paginatedGameHistory, pages: historyPages } = paginate(sortedHistory);
    const { paginated: paginatedRakeback, pages: rakePages } = paginate(sortedRakeback);

    // --- Process rakeback for display ---
    const rakebackDisplay = paginatedRakeback.map(rb => ({
      date: rb.creditedAt ? new Date(rb.creditedAt) : new Date(),
      weeklyWagered: rb.wagered || 0,
      percent: rb.percent || user.rakebackPercent || 5,
      rakeback: rb.amount || 0
    }));

    res.render('dashboard', {
      user,
      activeSection,
      currentPage,

      deposits: paginatedDeposits,
      depositPages,
      depositPage: currentPage,

      withdrawals: paginatedWithdrawals,
      withdrawalPages,
      withdrawalPage: currentPage,

      gameHistory: paginatedGameHistory,
      historyPages,
      historyPage: currentPage,

      rakebackHistory: rakebackDisplay,
      rakePages,
      rakePage: currentPage
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.redirect('/login');
  }
});

// Update profile details
router.post('/account/update', ensureAuth, async (req, res) => {
  try {
    const { firstName, lastName, address, phone, country } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      // This is unlikely if ensureAuth is working, but it's safe to check.
      return res.send('<script>alert("User not found. Please log in again.");window.location.href="/login";</script>');
    }
    user.firstName = firstName;
    user.lastName = lastName;
    user.address = address;
    user.phone = phone;
    user.country = country;

    await user.save();

    res.redirect('/dashboard?section=account');

  } catch (err) {
    console.error(err);
    res.send('<script>alert("Error updating profile.");window.history.back();</script>');
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