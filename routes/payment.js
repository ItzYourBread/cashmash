const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw'); // New model for withdrawals
const User = require('../models/User');

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Load agent payments JSON
const agentPaymentsPath = path.join(__dirname, '../agent-payments.json');
const agentPayments = JSON.parse(fs.readFileSync(agentPaymentsPath, 'utf-8'));

// ----------------- DEPOSIT ROUTES -----------------
router.get('/deposit', (req, res) => {
  res.render('deposit', { user: req.user, currentPage: 'deposit', agentPayments });
});

// Handle deposits for Bkash, Nagad, Upay
['bkash', 'nagad', 'upay'].forEach(method => {
  router.post(`/deposit/${method}`, ensureAuth, async (req, res) => {
    try {
      const { amount, transactionId } = req.body;
      if (!amount || !transactionId) throw new Error('Invalid input');

      const agents = agentPayments[method];
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];

      const depositData = {
        amount,
        method: method.charAt(0).toUpperCase() + method.slice(1),
        txnId: transactionId,
        status: 'Pending',
        agentName: randomAgent.full_name,
        agentContact: randomAgent.contact
      };

      // Save in User deposits
      req.user.deposits.push(depositData);
      await req.user.save();

      // Save in separate Deposit model
      await Deposit.create({
        user: req.user._id,
        ...depositData
      });

      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).send('Deposit failed');
    }
  });
});

// Handle BinancePay deposit
router.post('/deposit/binance', ensureAuth, async (req, res) => {
  try {
    const { amount, txnId } = req.body; // txnId comes from front-end as "Order ID"

    if (!amount || Number(amount) < 10 || !txnId) {
      throw new Error('Invalid deposit details');
    }

    // Pick a random agent from agentPayments JSON or default fallback
    const agents = agentPayments['binance'] || [{ full_name: 'MD Arif', contact: '01341803889' }];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    const depositData = {
      amount,
      method: 'BinancePay',
      txnId,
      status: 'Pending',
      agentName: "MD Arif",
      agentContact: "01341803889"
    };

    // Save in user's deposits array
    req.user.deposits.push(depositData);
    await req.user.save();

    // Save in Deposit model
    await Deposit.create({
      user: req.user._id,
      ...depositData
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('BinancePay deposit failed:', err);
    res.status(500).send('Deposit failed');
  }
});


// ----------------- WITHDRAW ROUTES -----------------
router.get('/withdraw', (req, res) => {
  res.render('withdraw', { user: req.user, currentPage: 'withdraw', agentPayments });
});

// Handle withdrawals for Bkash, Nagad, Upay
['bkash', 'nagad', 'upay'].forEach(method => {
  router.post(`/withdraw/${method}`, ensureAuth, async (req, res) => {
    try {
      const { fullName, contact, amount } = req.body;
      if (!fullName || !contact || !amount) throw new Error('Invalid input');

      // Deduct chips from user
      await req.user.deductChips(Number(amount));

      const withdrawData = {
        amount,
        method: method.charAt(0).toUpperCase() + method.slice(1),
        status: 'Pending',
        fullName,
        contact
      };

      // Save in User withdrawals
      req.user.withdrawals.push(withdrawData);
      await req.user.save();

      // Save in separate Withdraw model
      await Withdraw.create({
        user: req.user._id,
        ...withdrawData
      });

      res.redirect('/dashboard');
    } catch (err) {
      console.error(err);
      res.status(500).send('Withdrawal failed');
    }
  });
});

// Handle BinancePay withdrawal
router.post('/withdraw/binance', ensureAuth, async (req, res) => {
  try {
    const { userIdOrEmail, amount } = req.body;
    if (!userIdOrEmail || !amount) throw new Error('Invalid input');

    // Deduct chips from user
    await req.user.deductChips(Number(amount));

    const withdrawData = {
      amount,
      method: 'BinancePay',
      status: 'Pending',
      userIdOrEmail
    };

    req.user.withdrawals.push(withdrawData);
    await req.user.save();

    await Withdraw.create({
      user: req.user._id,
      ...withdrawData
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Withdrawal failed');
  }
});

module.exports = router;
