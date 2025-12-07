const express = require('express');
const router = express.Router();
const { spin, simulate } = require('../controllers/slotsController');
const slotsConfig = require('../config/slotsConfig');
const minesController = require('../controllers/minesController');
const baccaratController = require("../controllers/baccaratController");
const blackjackController = require('../controllers/blackjackController');
const aviatorController = require('../controllers/aviatorController');
const boxesController = require('../controllers/boxesController'); // <--- NEW IMPORT
const formatBalance = require('../utils/formatBalance'); 

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
function getCommonRenderData(req) {
    return {
        user: req.user,
        currentPage: 'games',
        formatBalance: formatBalance
    };
}
// ----------------------------

// --- UNIVERSAL SLOT ROUTE ---
router.get('/slot', ensureAuth, (req, res) => {
  const slotType = req.query.type || 'ClassicSlot';

  if (!slotsConfig[slotType]) {
    return res.redirect('/slot?type=ClassicSlot');
  }

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

// --- AVIATOR ROUTES ---
router.get('/aviator', ensureAuth, async (req, res) => {
  const roundState = aviatorController.getRoundStateSync();
  const renderData = {
    ...getCommonRenderData(req), 
    roundState, 
  };
  res.render('aviator', renderData);
});
router.post('/aviator/bet', ensureAuth, aviatorController.placeBet);
router.post('/aviator/cashout', ensureAuth, aviatorController.cashOut);

// --- BOXES (TOWER) ROUTES --- 
router.get('/boxes', ensureAuth, (req, res) => res.render('boxes', getCommonRenderData(req)));
router.post('/boxes/start', ensureAuth, boxesController.start);     // <--- NEW
router.post('/boxes/reveal', ensureAuth, boxesController.reveal);   // <--- NEW
router.post('/boxes/cashout', ensureAuth, boxesController.cashout); // <--- NEW


module.exports = router;