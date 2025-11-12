const express = require('express');
const router = express.Router();
const { spin, simulate } = require('../controllers/slotsController');
const slotsConfig = require('../config/slotsConfig');
const minesController = require('../controllers/minesController');
const baccaratController = require("../controllers/baccaratController");
const blackjackController = require('../controllers/blackjackController');
const aviatorController = require('../controllers/aviatorController');
const formatBalance = require('../utils/formatBalance'); // <--- Ensure this path is correct

// ensureAuth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // User is authenticated, proceed to the next middleware/route handler
    return next();
  } else {
    // User is NOT authenticated, redirect to the login page
    return res.redirect('/login');
  }
}

// --- COMMON RENDER OBJECT ---
// This object contains all the common variables and the utility function
// to be passed to every single game view.
function getCommonRenderData(req) {
    return {
        user: req.user,
        currentPage: 'games',
        // Make the utility function available to the EJS template
        formatBalance: formatBalance
    };
}
// ----------------------------

// --- UNIVERSAL SLOT ROUTE ---
router.get('/slot', ensureAuth, (req, res) => {
  const slotType = req.query.type || 'ClassicSlot';

  // Validate slot type
  if (!slotsConfig[slotType]) {
    return res.redirect('/slot?type=ClassicSlot');
  }

  // ✅ Renders the single dynamic slot view
  res.render('slots', {
    ...getCommonRenderData(req),
    slotType,
    slotsConfig,
  });
});

router.post('/slots/spin', ensureAuth, spin);

router.get('/slots/simulate', simulate);


// --- MINES ROUTES ---
router.get('/mines', ensureAuth, (req, res) => res.render('mines', getCommonRenderData(req)));
router.post('/mines/start', ensureAuth, minesController.start);
router.post('/mines/reveal', ensureAuth, minesController.reveal);
router.post('/mines/cashout', ensureAuth, minesController.cashout);

// --- BACCARAT ROUTES ---
router.get('/baccarat', ensureAuth, (req, res) => res.render('baccarat', getCommonRenderData(req)));
router.post("/baccarat/play", ensureAuth, baccaratController.playBaccarat);

// --- BLACKJACK ROUTES ---
router.get('/blackjack', ensureAuth, (req, res) => res.render('blackjack', getCommonRenderData(req)));
router.post('/blackjack/start', ensureAuth, blackjackController.startGame);
router.post('/blackjack/hit', ensureAuth, blackjackController.hit);
router.post('/blackjack/stand', ensureAuth, blackjackController.stand);

// Aviator page
router.get('/aviator', ensureAuth, async (req, res) => {
  // Get current round state for initial render
  const roundState = aviatorController.getRoundStateSync();
  
  // Merge the common data with the specific aviator data
  const renderData = {
    ...getCommonRenderData(req), // Spread the common data first
    roundState, 
  };
  
  res.render('aviator', renderData);
});
router.post('/aviator/bet', ensureAuth, aviatorController.placeBet);
router.post('/aviator/cashout', ensureAuth, aviatorController.cashOut);

// router.get('/european-roulette', ensureAuth, (req, res) => res.render('european-roulette', getCommonRenderData(req)));


module.exports = router;