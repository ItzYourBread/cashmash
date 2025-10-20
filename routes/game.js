// routes/game.js
const express = require('express');
const router = express.Router();
const { spin } = require('../controllers/slotsController');
const minesController = require('../controllers/minesController');

// ensureAuth middleware (same as your earlier code)
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.get('/slots', ensureAuth, (req, res) => {
  res.render('slots', { user: req.user });
});

// API endpoint used by client to request a spin
router.post('/slots/spin', ensureAuth, spin);

router.get('/mines', ensureAuth, (req, res) => {
  res.render('mines', { user: req.user });
});

// Mines endpoints
router.post('/mines/start', ensureAuth, minesController.start);
router.post('/mines/reveal', ensureAuth, minesController.reveal);
router.post('/mines/cashout', ensureAuth, minesController.cashout);

module.exports = router;
