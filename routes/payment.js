const express = require('express');
const router = express.Router();

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

router.get('/deposit', (req, res) => {
  res.render('deposit', { user: req.user, currentPage: 'deposit' });
});

module.exports = router;
