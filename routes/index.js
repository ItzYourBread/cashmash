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


// Wiki
// Wiki (with query param for different sections)
router.get('/wiki', (req, res) => {
  const page = req.query.search || 'index'; // Default to 'index' if no search param
  let viewPath = 'wiki'; // Default to main wiki hub

  switch (page) {
    case 'about':
      viewPath = 'wiki/about';
      break;
    case 'terms':
      viewPath = 'wiki/terms';
      break;
    case 'promotions':
      viewPath = 'wiki/promotions';
      break;
    case 'responsible-gaming':
      viewPath = 'wiki/responsible-gaming';
      break;
    // Add more cases for other wiki pages as needed
    default:
      viewPath = 'wiki'; // Fallback to hub if invalid
  }

  res.render(viewPath, { user: req.user, currentPage: 'wiki', wikiPage: page });
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
