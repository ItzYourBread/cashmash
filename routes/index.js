const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Home
router.get('/', (req, res) => {
  res.render('index', { user: req.user, currentPage: '' });
});

// Games
router.get('/games', (req, res) => {
  res.render('games', { user: req.user, currentPage: 'games' });
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Get top 10 users by balance (or balance)
    const topUsers = await User.find({})
      .sort({ balance: -1 })
      .limit(10)
      .select('username email balance');

    let userRank = null;

    if (req.user) {
      // Find the rank (position) of logged-in user
      const higherUsersCount = await User.countDocuments({ balance: { $gt: req.user.balance } });
      userRank = higherUsersCount + 1;
    }

    res.render('leaderboard', {
      user: req.user,
      currentPage: 'leaderboard',
      topUsers,
      userRank
    });
  } catch (err) {
    console.error('Leaderboard Error:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
