const express = require('express');
const router = express.Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

router.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { user: req.user });
});

module.exports = router;
