const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw');
const withdrawMethods = require('../config/withdrawMethods');
const NowPaymentsApi = require('@nowpaymentsio/nowpayments-api-js');
const npApi = new NowPaymentsApi({ apiKey: process.env.NOWPAYMENTS_API_KEY });
const User = require("../models/User");
const mongoose = require('mongoose'); // Mongoose is correctly imported

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // User is authenticated, proceed to the next middleware/route handler
    return next();
  } else {
    // User is NOT authenticated, redirect to the login page
    return res.redirect('/login');
  }
}

function formatCurrencyNetwork(cur) {
  const c = cur.toLowerCase();

  const mapping = {
    usdttrc20: "USDT-TRC20",
    // usdterc20: "USDT-ERC20",
    usdtbsc: "USDT-BSC",
    usdtsol: "USDT-SOL",
    usdtmatic: "USDT-MATIC",
    usdtcelo: "USDT-CELO",
    usdtarb: "USDT-ARB"
  };

  return mapping[c] || cur.toUpperCase();
}

// Function to handle referral rewards (Add this outside the router posts, e.g., at the top of the file)
async function rewardReferrer(referredUser, depositAmount) {
  // Check if the user was referred by someone
  if (!referredUser.referredBy) return;

  const User = mongoose.model('User'); // Need to access the User model
  
  // Find the referrer using the stored ObjectId
  const referrer = await User.findById(referredUser.referredBy);
  
  if (!referrer) {
    console.warn(`⚠️ Referrer (ID: ${referredUser.referredBy}) not found for user ${referredUser.username}`);
    return;
  }

  // Calculate commission (using the referrer's current rate)
  const rate = referrer.referralCommissionRate || 5;
  const commission = depositAmount * (rate / 100);

  if (commission > 0) {
    // 1. Update the referrer's balance and total earnings
    referrer.balance += commission;
    referrer.totalReferralEarnings += commission;

    // 2. Log the transaction in referralHistory
    referrer.referralHistory.push({
      fromUser: referredUser._id, // The ID of the user who made the deposit
      amount: commission,
      date: new Date()
    });

    // 3. Save the referrer's updated document
    await referrer.save();
    console.log(`✅ Referral reward of $${commission.toFixed(2)} applied to referrer ${referrer.username}`);
  }
}

// Load agent payments JSON
const agentPaymentsPath = path.join(__dirname, '../agent-payments.json');
const agentPayments = JSON.parse(fs.readFileSync(agentPaymentsPath, 'utf-8'));

let cachedCurrencies = null;
let lastFetch = 0;

router.get('/deposit', ensureAuth, async (req, res) => {
  try {
    const now = Date.now();

    const CACHE_DURATION = 10 * 60 * 1000;

    if (!cachedCurrencies || now - lastFetch > CACHE_DURATION) {
      console.log("🔄 Fetching NOWPayments currencies...");

      const { data } = await axios.get('https://api.nowpayments.io/v1/currencies', {
        headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY }
      });

      const currencies = Array.isArray(data.currencies) ? data.currencies : [];

      const allowedStablecoins = [
        'usdttrc20',
        'usdtbsc',
        'usdtsol',
        'usdtmatic',
        'usdtcelo',
        'usdtarb'
      ];

      cachedCurrencies = currencies.filter(c =>
        allowedStablecoins.includes(c.toLowerCase())
      );

      lastFetch = now;
      console.log(`✅ Cached ${cachedCurrencies.length} stablecoin networks`);
    }

    // Fetch referral code of referrer
    let usedReferralCode = null;

    if (req.user?.referredBy) {
      const referrer = await User.findById(req.user.referredBy).select("referralCode");
      if (referrer) usedReferralCode = referrer.referralCode;
    }

    // SUCCESS RENDER
    res.render('deposit', {
      user: req.user,
      userCountry: req.user.country,
      usdToBdtRate: 123,           // <--- always pass
      agentPayments,
      availableCryptos: cachedCurrencies || [],
      currentPage: 'deposit',
      usedReferralCode
    });

  } catch (err) {
    console.error("❌ Error fetching NOWPayments currencies:", err.message);

    // FAILOVER RENDER
    res.render('deposit', {
      user: req.user,
      userCountry: req.user.country,    // <--- always pass
      usdToBdtRate: 123,                // <--- FIX ADDED
      agentPayments,
      availableCryptos: cachedCurrencies || [],
      currentPage: 'deposit',
      usedReferralCode: null
    });
  }
});

// Handle deposits for Bkash, Nagad, Upay
['Bkash', 'Nagad', 'Upay'].forEach(method => {
  router.post(`/deposit/${method}`, ensureAuth, async (req, res) => {
    if (req.user.country !== 'BD') {
      return res.status(403).send(`${method} deposit not available in your country.`);
    }

    try {
      const { amount, transactionId } = req.body;
      if (!amount || !transactionId) throw new Error('Invalid input');

      const agents = agentPayments[method];
      if (!agents || agents.length === 0) {
        return res.status(503).send(`Payment service unavailable: No active agents for ${method}.`);
      }

      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const newDepositId = new mongoose.Types.ObjectId();

      const depositData = {
        _id: newDepositId,
        amount: Number(amount),
        amountBDT: Number(amount * 123),
        method,
        txnId: transactionId,
        status: 'Pending',
        agentName: randomAgent.full_name,
        agentContact: randomAgent.contact
      };

      // Save deposit in user
      req.user.deposits.push(depositData);
      await req.user.save();

      // Save deposit in Deposit model
      await Deposit.create({
        _id: newDepositId,
        user: req.user._id,
        ...depositData
      });

      // ✅ First-Time Deposit Bonus Check
      const hasCompletedDeposit = req.user.deposits.some(d => d.status === 'Completed');
      if (!hasCompletedDeposit) {
        const bonusAmount = Number(amount); // 100% bonus
        req.user.balance += bonusAmount;
        await req.user.save();
        console.log(`🎁 First-time deposit bonus of $${bonusAmount} applied to user ${req.user.username}`);
      }

      // 🎁 NEW: REFERRAL REWARD (Assuming reward on PENDING for manual deposits)
      await rewardReferrer(req.user, Number(amount));

      res.redirect('/dashboard?section=deposit&page=1');
    } catch (err) {
      console.error(err);
      res.status(500).send('Deposit failed');
    }
  });
});

// Handle BinancePay deposit (USD)
router.post('/deposit/binance', ensureAuth, async (req, res) => {
  try {
    const { amount, txnId } = req.body;
    const parsedAmount = Number(amount);

    if (!txnId || isNaN(parsedAmount) || parsedAmount < 1) {
      throw new Error('Invalid deposit details');
    }

    const newDepositId = new mongoose.Types.ObjectId();
    const depositData = {
      _id: newDepositId,
      amount: parsedAmount,
      method: 'BinancePay',
      txnId,
      status: 'Pending',
      agentName: "MD Arif",
      agentContact: "01341803889",
    };

    req.user.deposits.push(depositData);
    await req.user.save();
    await Deposit.create({ _id: newDepositId, user: req.user._id, ...depositData });

    // ✅ First-Time Deposit Bonus Check
    const hasCompletedDeposit = req.user.deposits.some(d => d.status === 'Completed');
    if (!hasCompletedDeposit) {
      const bonusAmount = parsedAmount;
      req.user.balance += bonusAmount;
      await req.user.save();
      console.log(`🎁 First-time deposit bonus of $${bonusAmount} applied to user ${req.user.username}`);
    }

    // 🎁 NEW: REFERRAL REWARD (Assuming reward on PENDING for BinancePay)
    await rewardReferrer(req.user, parsedAmount);

    res.redirect('/dashboard?section=deposit&page=1');
  } catch (err) {
    console.error('BinancePay deposit failed:', err);
    res.status(500).send('Deposit failed');
  }
});

// Handle Crypto deposit (USD)
router.post('/deposit/crypto', ensureAuth, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const usdAmount = Number(amount);

    if (!usdAmount || usdAmount < 1) return res.status(400).send('Invalid amount');

    const allowedCurrencies = [
      'usdttrc20', 'usdtbsc', 'usdtsol', 'usdtmatic', 'usdtcelo', 'usdtarb',
    ];

    const currencyLower = currency.toLowerCase();
    if (!allowedCurrencies.includes(currencyLower)) {
      return res.status(400).send('Unsupported USDT network');
    }

    const payment = await npApi.createInvoice({
      price_amount: usdAmount,
      price_currency: "usd",
      pay_currency: currencyLower,
      order_id: req.user._id.toString(),
      order_description: `Crypto deposit by ${req.user.username}`,
      ipn_callback_url: `${process.env.BASE_URL}/api/nowpayments/webhook`
    });

    const txnId = payment.id || payment.payment_id || payment.invoice_id;
    if (!txnId) return res.status(500).send("Failed to create payment ID.");

    const formattedCurrency = formatCurrencyNetwork(currencyLower);
    const depositData = {
      user: req.user._id,
      amount: usdAmount,
      method: `Crypto (${formattedCurrency})`,
      txnId,
      status: "Pending"
    };

    req.user.deposits.push(depositData);
    await req.user.save();
    await Deposit.create(depositData);

    // ✅ First-Time Deposit Bonus will be applied in the webhook after status 'Completed'
    // (Crypto deposits are async, so we handle bonus when payment is confirmed)

    return res.redirect(payment.invoice_url);

  } catch (err) {
    console.error("NOWPayments error:", err);
    return res.status(500).send("Failed to create crypto payment.");
  }
});

// ✅ WEBHOOK: Handle NOWPayments notifications
router.post(
  '/api/nowpayments/webhook',
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf; // for correct signature verification
    },
  }),
  async (req, res) => {
    try {
      const crypto = require('crypto');
      const signature = req.headers['x-nowpayments-sig'];
      const body = req.body;

      // ✅ Generate the HMAC signature
      const hmac = crypto
        .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
        .update(JSON.stringify(body))
        .digest('hex');

      const isDev = process.env.NODE_ENV !== 'production';

      // ✅ Signature verification
      if (hmac !== signature) {
        if (isDev) {
          console.warn('⚠️ Invalid NOWPayments signature (ignored in dev)');
        } else {
          console.warn('❌ Invalid NOWPayments signature (blocked)');
          return res.status(403).send('Invalid signature');
        }
      }

      const { payment_id, payment_status, order_id, price_amount } = body;
      console.log('📩 NOWPayments Webhook:', payment_status, payment_id);

      // ✅ Allow manual test in dev
      if (isDev && body.test === true) {
        console.log('🧪 Test webhook received, simulating success...');
      }

      // ✅ Only mark completed if finished or confirmed
      if (
        payment_status === 'confirmed' ||
        payment_status === 'finished' ||
        (isDev && body.test === true)
      ) {
        const userId = order_id;
        const User = mongoose.model('User');
        const user = await User.findById(userId);
        const deposit = await Deposit.findOne({ txnId: payment_id });

        if (!user) {
          console.warn('⚠️ User not found for order_id:', userId);
          return res.sendStatus(404);
        }

        if (!deposit) {
          console.warn('⚠️ Deposit not found for payment_id:', payment_id);
          return res.sendStatus(404);
        }

        // ✅ Only update if not already completed
        if (deposit.status !== 'Completed') {
          deposit.status = 'Completed';
          await deposit.save();

          // ✅ Update the deposit inside user.deposits array
          const userDeposit = user.deposits.find(d => d.txnId === payment_id);
          if (userDeposit) userDeposit.status = 'Completed';

          // 💰 Reward user with deposit amount
          const rewardAmount = deposit.amount || price_amount || 0;
          user.balance = (user.balance || 0) + rewardAmount;

          await rewardReferrer(user, rewardAmount);

          // ✅ FIRST-TIME DEPOSIT BONUS
          const hasPreviousCompletedDeposit = user.deposits.some(
            d => d.status === 'Completed' && d.txnId !== payment_id
          );
          if (!hasPreviousCompletedDeposit) {
            const bonusAmount = rewardAmount; // 100% bonus
            user.balance += bonusAmount;
            console.log(`🎁 First-time deposit bonus of $${bonusAmount} applied to user ${user.username}`);
          }

          await user.save();

          console.log(
            `✅ User ${user.username} credited $${rewardAmount} and deposit marked Completed in both models.`
          );
        } else {
          console.log(
            `ℹ️ Deposit ${payment_id} already marked Completed, skipping reward.`
          );
        }
      } else {
        console.log('ℹ️ Payment not yet complete, status:', payment_status);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('❌ NOWPayments webhook failed:', err);
      res.sendStatus(500);
    }
  }
);


// Handle withdrawals for Bkash, Nagad, Upay
['bkash', 'nagad', 'upay'].forEach(method => {
  router.post(`/withdraw/${method}`, ensureAuth, async (req, res) => {
    try {
      const { fullName, contact, amount } = req.body;
      if (!fullName || !contact || !amount) throw new Error('Invalid input');

      // Deduct balance from user (Place this before DB writes)
      await req.user.deductChips(Number(amount));

      // ⭐ CRITICAL FIX: Generate ID here to ensure consistency ⭐
      const newWithdrawalId = new mongoose.Types.ObjectId();

      const withdrawData = {
        _id: newWithdrawalId, // <-- Use the generated ID
        amount: Number(amount), // Ensure amount is number
        method: method.charAt(0).toUpperCase() + method.slice(1),
        status: 'Pending',
        fullName,
        contact
      };

      // 1. Save in User withdrawals (Uses generated ID)
      req.user.withdrawals.push(withdrawData);
      await req.user.save();

      // 2. Save in separate Withdraw model (Uses generated ID and explicit user/ID)
      await Withdraw.create({
        _id: newWithdrawalId, // IMPORTANT
        user: req.user._id,   // IMPORTANT
        ...withdrawData
      });

      res.redirect('/dashboard?section=withdraw&page=1');
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

    // Deduct balance from user
    await req.user.deductChips(Number(amount));

    // ⭐ CRITICAL FIX: Generate ID here to ensure consistency ⭐
    const newWithdrawalId = new mongoose.Types.ObjectId();

    // Use placeholder values to satisfy the Mongoose model's 'required' fields
    const withdrawData = {
      _id: newWithdrawalId, // <-- Use the generated ID
      amount: Number(amount),
      method: 'BinancePay',
      status: 'Pending',
      userIdOrEmail,
      fullName: req.user.username || 'N/A',
      contact: req.user.email || 'binance-withdrawal',
    };

    // 1. Save in User withdrawals
    req.user.withdrawals.push(withdrawData);
    await req.user.save();

    // 2. Save in separate Withdraw model (Uses generated ID and explicit user/ID)
    await Withdraw.create({
      _id: newWithdrawalId, // IMPORTANT
      user: req.user._id,   // IMPORTANT
      ...withdrawData
    });

    res.redirect('/dashboard?section=withdraw&page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send('Withdrawal failed');
  }
});

// ========================================
// Crypto Withdrawal (USDT Any Network)
// ========================================
router.post('/withdraw/crypto', ensureAuth, async (req, res) => {
  try {
    const { WalletAddress, network, amount } = req.body;

    if (!WalletAddress || !network || !amount) {
      throw new Error("Invalid input");
    }

    // Deduct user balance first
    await req.user.deductChips(Number(amount));

    // Generate consistent Mongo ID
    const newWithdrawalId = new mongoose.Types.ObjectId();

    // Construct withdraw object
    const withdrawData = {
      _id: newWithdrawalId,
      amount: Number(amount),
      method: 'Crypto',
      WalletAddress,
      note: `USDT Network: ${network}`, // ⭐ Add selected network to note
      status: 'Pending'
    };

    // Store inside user document
    req.user.withdrawals.push(withdrawData);
    await req.user.save();

    // Store inside Withdraw model
    await Withdraw.create({
      _id: newWithdrawalId,
      user: req.user._id,
      ...withdrawData
    });

    res.redirect('/dashboard?section=withdraw&page=1');
  } catch (err) {
    console.error(err);
    res.status(500).send("Crypto withdrawal failed");
  }
});


// Handle Withdrawal Cancellation
router.post('/withdraw/cancel/:id', ensureAuth, async (req, res) => {
  const withdrawId = req.params.id;
  const userId = req.user._id;

  try {
    // 1. Find withdrawal in main Withdraw collection
    const withdrawal = await Withdraw.findOne({
      _id: withdrawId,
      user: userId
    });

    if (!withdrawal) {
      return res.status(404).send('Withdrawal record not found or does not belong to you.');
    }

    // 2. Only pending withdrawals can be cancelled
    if (withdrawal.status !== 'Pending') {
      return res.status(403).send(`Withdrawal is ${withdrawal.status} and cannot be cancelled.`);
    }

    // 3. Update main withdrawal record
    withdrawal.status = 'Cancelled';
    await withdrawal.save();

    // 4. Update embedded withdrawal record + refund balance
    const userWithdrawalIndex = req.user.withdrawals.findIndex(
      w => w._id.toString() === withdrawId
    );

    if (userWithdrawalIndex !== -1) {
      req.user.withdrawals[userWithdrawalIndex].status = 'Cancelled';
      req.user.balance += withdrawal.amount;
      await req.user.save();
    } else {
      // If embedded record missing, still refund to avoid user loss
      req.user.balance += withdrawal.amount;
      await req.user.save();
    }

    res.redirect('/dashboard?section=withdraw');

  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).send('Invalid Withdrawal ID format.');
    }
    res.status(500).send('Cancellation failed due to a server error.');
  }
});

module.exports = router;