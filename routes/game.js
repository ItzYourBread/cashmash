const express = require('express');
const router = express.Router();

// Middleware to ensure user is logged in
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Slots page
router.get('/slots', ensureAuth, (req, res) => {
  res.render('slots', { user: req.user });
});

module.exports = router;
