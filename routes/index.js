const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { user: req.user, currentPage: '' });
});

router.get('/games', (req, res) => {
  res.render('games', { user: req.user, currentPage: 'games' });
});

router.get('/leaderboard', (req, res) => {
  res.render('leaderboard', { user: req.user, currentPage: 'leaderboard' });
});


module.exports = router;
