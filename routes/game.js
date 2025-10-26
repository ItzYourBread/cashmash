const express = require('express');
const router = express.Router();
const { spin } = require('../controllers/slotsController');
const minesController = require('../controllers/minesController');
const baccaratController = require("../controllers/baccaratController");
const blackjackController = require('../controllers/blackjackController');
const aviatorController = require('../controllers/aviatorController');

// ensureAuth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// --- SLOTS ROUTES ---
router.get('/slots', ensureAuth, (req, res) => res.render('slots', { user: req.user, currentPage: 'games' }));
router.post('/slots/spin', ensureAuth, spin);

// --- MINES ROUTES ---
router.get('/mines', ensureAuth, (req, res) => res.render('mines', { user: req.user, currentPage: 'games' }));
router.post('/mines/start', ensureAuth, minesController.start);
router.post('/mines/reveal', ensureAuth, minesController.reveal);
router.post('/mines/cashout', ensureAuth, minesController.cashout);

// --- BACCARAT ROUTES ---
router.get('/baccarat', ensureAuth, (req, res) => res.render('baccarat', { user: req.user, currentPage: 'games' }));
router.post("/baccarat/play", ensureAuth, baccaratController.playBaccarat);

// --- BLACKJACK ROUTES ---
router.get('/blackjack', ensureAuth, (req, res) => res.render('blackjack', { user: req.user, currentPage: 'games' }));
router.post('/blackjack/start', ensureAuth, blackjackController.startGame);
router.post('/blackjack/hit', ensureAuth, blackjackController.hit);
router.post('/blackjack/stand', ensureAuth, blackjackController.stand);

// Aviator page
router.get('/aviator', ensureAuth, async (req, res) => {
  // Get current round state for initial render
  const roundState = aviatorController.getRoundStateSync();
  res.render('aviator', { user: req.user, roundState, currentPage: 'games' });
});
router.post('/aviator/bet', ensureAuth, aviatorController.placeBet);
router.post('/aviator/cashout', ensureAuth, aviatorController.cashOut);


module.exports = router;
