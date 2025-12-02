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
    const country = req.user?.country || "Unknown";
    const PAGE_SIZE = 10;
    const currentPage = parseInt(req.query.page) || 1;
    const activeSection = req.query.section || 'statistics';

    // --- 1. User Data Retrieval ---
    // Populate sub-documents and get the current user object
    const user = await User.findById(req.user._id)
      .populate('deposits')
      .populate('withdrawals')
      .populate('gameHistory');

    if (!user) {
        // Should not happen if ensureAuth works, but good practice
        return res.redirect('/login'); 
    }

    // --- 2. Withdrawal Methods Logic ---
    let availableMethods = ["BinancePay", "Crypto"]; // universal ones
    if (country === "BD") {
      availableMethods.push("Bkash", "Nagad", "Upay");
    }

    // --- 3. Sorting Helper (newest first) ---
    const sortByDateDesc = (arr, field = 'createdAt') =>
      [...(arr || [])].sort((a, b) => new Date(b[field]) - new Date(a[field]));

    const sortedDeposits = sortByDateDesc(user.deposits, 'createdAt');
    const sortedWithdrawals = sortByDateDesc(user.withdrawals, 'createdAt');
    const sortedHistory = sortByDateDesc(user.gameHistory, 'playedAt');
    const sortedRakeback = sortByDateDesc(user.rakebackHistory || [], 'creditedAt');

    // --- 4. Pagination Helper ---
    const paginate = (arr) => {
      const total = arr.length;
      const pages = Math.ceil(total / PAGE_SIZE);
      const start = (currentPage - 1) * PAGE_SIZE;
      return { paginated: arr.slice(start, start + PAGE_SIZE), total, pages };
    };

    // --- 5. Pagination Execution ---
    const { paginated: paginatedDeposits, pages: depositPages } = paginate(sortedDeposits);
    const { paginated: paginatedWithdrawals, pages: withdrawalPages } = paginate(sortedWithdrawals);
    const { paginated: paginatedGameHistory, pages: historyPages } = paginate(sortedHistory);
    const { paginated: paginatedRakeback, pages: rakePages } = paginate(sortedRakeback);


    // --- 6. REFERRAL LOGIC (NEW) ---
    // Fetch users referred by the current user. We use find() since referredBy is a top-level field.
    const allReferrals = await User.find({ referredBy: user._id })
      .select('username createdAt totalWagered') // Select fields needed for the display table
      .lean(); // Use .lean() for faster read access

    const { paginated: paginatedReferrals, pages: referralPages } = paginate(allReferrals);
    
    // Set referralCount directly on the user object for convenience in EJS
    user.referralCount = allReferrals.length;


    // --- 7. Process Data for Display ---
    const rakebackDisplay = paginatedRakeback.map(rb => ({
      date: rb.creditedAt ? new Date(rb.creditedAt) : new Date(),
      weeklyWagered: rb.wagered || 0,
      percent: rb.percent || user.rakebackPercent || 5,
      rakeback: rb.amount || 0
    }));


    // --- 8. Render View ---
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
      rakePage: currentPage,
      availableMethods,
      
      // ✅ NEW: Referral data
      referrals: paginatedReferrals,
      referralPages,
      referralPage: currentPage,
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