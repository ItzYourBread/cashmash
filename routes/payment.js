const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Deposit = require('../models/Deposit');
const Withdraw = require('../models/Withdraw');
const NowPaymentsApi = require('@nowpaymentsio/nowpayments-api-js');
const npApi = new NowPaymentsApi({ apiKey: process.env.NOWPAYMENTS_API_KEY });
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
// Load agent payments JSON
const agentPaymentsPath = path.join(__dirname, '../agent-payments.json');
const agentPayments = JSON.parse(fs.readFileSync(agentPaymentsPath, 'utf-8'));

let cachedCurrencies = null;
let lastFetch = 0;

router.get('/deposit', ensureAuth, async (req, res) => {
  try {
    const now = Date.now();

    // Cache refresh every 10 minutes
    const CACHE_DURATION = 10 * 60 * 1000;

    if (!cachedCurrencies || now - lastFetch > CACHE_DURATION) {
      console.log("🔄 Fetching NOWPayments currencies...");

      const { data } = await axios.get('https://api.nowpayments.io/v1/currencies', {
        headers: { 'x-api-key': process.env.NOWPAYMENTS_API_KEY }
      });

      // Ensure we have data
      const currencies = Array.isArray(data.currencies) ? data.currencies : [];

      const allowedStablecoins = [
        'usdttrc20',
        'usdterc20',
        'usdtbsc',
        'usdtsol',
        'usdtmatic',
        'usdtcelo',
        'usdtarb',
        'usdtarc20',
        'usdtton',
        'usddtrc20'
      ];

      cachedCurrencies = currencies.filter(c =>
        allowedStablecoins.includes(c.toLowerCase())
      );

      lastFetch = now;
      console.log(`✅ Cached ${cachedCurrencies.length} stablecoin networks`);
    }

    // Render deposit page
    res.render('deposit', {
      user: req.user,
      agentPayments,
      availableCryptos: cachedCurrencies || [],
      currentPage: 'deposit',
    });

  } catch (err) {
    console.error("❌ Error fetching NOWPayments currencies:", err.message);

    // Use cached data if available, otherwise fallback to empty
    res.render('deposit', {
      user: req.user,
      agentPayments,
      availableCryptos: cachedCurrencies || [],
      currentPage: 'deposit',
    });
  } 
});

// Handle deposits for Bkash, Nagad, Upay
['Bkash', 'Nagad', 'Upay'].forEach(method => {
  router.post(`/deposit/${method}`, ensureAuth, async (req, res) => {
    try {
      const { amount, transactionId } = req.body;
      if (!amount || !transactionId) throw new Error('Invalid input');

      const agents = agentPayments[method];

      if (!agents || agents.length === 0) {
        console.warn(`[Deposit] No agents found for method: ${method}.`);
        return res.status(503).send(`Payment service unavailable: No active agents for ${method}.`);
      }

      const randomAgent = agents[Math.floor(Math.random() * agents.length)];

      // ✅ FIX: Use consistent ID for deposit
      const newDepositId = new mongoose.Types.ObjectId();

      const depositData = {
        _id: newDepositId,
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

      // Save in separate Deposit model (Explicitly pass _id and user)
      await Deposit.create({
        _id: newDepositId,
        user: req.user._id,
        ...depositData
      });

      res.redirect('/dashboard?section=deposit&page=1');
    } catch (err) {
      console.error(err);
      res.status(500).send('Deposit failed');
    }
  });
});

// Handle BinancePay deposit
router.post('/deposit/binance', ensureAuth, async (req, res) => {
  try {
    const { amount: usdAmount, bdtAmount, txnId } = req.body;

    const parsedUsdAmount = Number(usdAmount);
    const parsedBdtAmount = Number(bdtAmount);

    if (!txnId || isNaN(parsedUsdAmount) || isNaN(parsedBdtAmount) || parsedBdtAmount < 10) {
      throw new Error('Invalid deposit details');
    }

    // ✅ FIX: Use consistent ID for deposit
    const newDepositId = new mongoose.Types.ObjectId();

    const depositData = {
      _id: newDepositId,
      amount: parsedBdtAmount,
      amountUSD: parsedUsdAmount,
      method: 'BinancePay',
      txnId,
      status: 'Pending',
      agentName: "MD Arif",
      agentContact: "01341803889"
    };

    // Save in user's deposits array
    req.user.deposits.push(depositData);
    await req.user.save();

    // Save in Deposit model (Explicitly pass _id and user)
    await Deposit.create({
      _id: newDepositId,
      user: req.user._id,
      ...depositData
    });

    res.redirect('/dashboard?section=deposit&page=1');
  } catch (err) {
    console.error('BinancePay deposit failed:', err);
    res.status(500).send('Deposit failed');
  }
});

router.post('/deposit/crypto', ensureAuth, async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const usdAmount = Number(amount);

    // Validate amount
    if (!usdAmount || usdAmount < 1) {
      return res.status(400).send('Invalid amount');
    }

    // Allowed USDT networks
    const allowedCurrencies = [
      'usdttrc20',
      'usdterc20',
      'usdtbsc',
      'usdtsol',
      'usdtmatic',
      'usdtcelo',
      'usdtarb',
      'usdtarc20',
      'usdtton',
      'usddtrc20'
    ];

    // Normalize input to lowercase for safety
    const currencyLower = currency.toLowerCase();

    if (!allowedCurrencies.includes(currencyLower)) {
      return res.status(400).send('Unsupported USDT network');
    }

    // Create NOWPayments invoice
    const payment = await npApi.createInvoice({
      price_amount: usdAmount,
      price_currency: "usd",
      pay_currency: currencyLower, // set network
      order_id: req.user._id.toString(),
      order_description: `Crypto deposit by ${req.user.username}`,
      ipn_callback_url: `${process.env.BASE_URL}/api/nowpayments/webhook`
    });

    console.log("NOWPayments Payment:", payment);

    // Extract transaction ID
    const txnId = payment.id || payment.payment_id || payment.invoice_id;
    if (!txnId) {
      console.warn("⚠️ NOWPayments did not return a payment ID");
      return res.status(500).send("Failed to create payment ID.");
    }

    // Store deposit in DB
    const depositData = {
      user: req.user._id,
      amount: usdAmount * 122.24, // optional: USD→BDT conversion
      amountUSD: usdAmount,
      method: `Crypto (${currency.toUpperCase()})`, // show network
      txnId,
      status: "Pending"
    };

    req.user.deposits.push(depositData);
    await req.user.save();
    await Deposit.create(depositData);

    // Redirect to payment page
    return res.redirect(payment.invoice_url);

  } catch (err) {
    console.error("NOWPayments error:", err);

    // Handle known NOWPayments errors
    if (err.code === 'INVALID_REQUEST_PARAMS') {
      return res.status(400).send(`NOWPayments error: ${err.message}`);
    }

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
          const userDeposit = user.deposits.find(
            (d) => d.txnId === payment_id
          );

          if (userDeposit) {
            userDeposit.status = 'Completed';
          }

          // 💰 Reward user (only once)
          const rewardAmount = deposit.amount || price_amount || 0;
          user.chips = (user.chips || 0) + rewardAmount;

          await user.save();

          console.log(
            `✅ User ${user.username} credited ৳${rewardAmount} and deposit marked Completed in both models.`
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

      // Deduct chips from user (Place this before DB writes)
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

    // Deduct chips from user
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

// Handle Withdrawal Cancellation (with Debugging Logs) 
router.post('/withdraw/cancel/:id', ensureAuth, async (req, res) => {
  const withdrawId = req.params.id;
  const userId = req.user._id;

  console.log(`--- CANCELLATION DEBUG START ---`);
  console.log(`1. Incoming Withdraw ID (from URL): ${withdrawId}`);
  console.log(`2. User ID (logged in user): ${userId}`);

  try {
    // 1. Find the withdrawal record in the main Withdraw collection
    const withdrawal = await Withdraw.findOne({
      _id: withdrawId,
      user: userId
    });

    if (!withdrawal) {
      console.log(`3. Query failed for _id: ${withdrawId} and user: ${userId}`);

      const userOwned = await Withdraw.findById(withdrawId);
      if (userOwned) {
        console.warn(`4. Withdrawal ID ${withdrawId} exists but is owned by ${userOwned.user}.`);
      } else {
        console.log(`4. Withdrawal ID ${withdrawId} does NOT exist in the main Withdraw collection.`);
      }

      console.log(`--- CANCELLATION DEBUG END ---`);
      return res.status(404).send('Withdrawal record not found or does not belong to you.');
    }

    // --- SUCCESS PATH ---
    console.log(`3. Withdrawal found. Status: ${withdrawal.status}`);

    // 2. Check if the withdrawal is pending
    if (withdrawal.status !== 'Pending') {
      console.log(`--- CANCELLATION DEBUG END ---`);
      return res.status(403).send(`Withdrawal is ${withdrawal.status} and cannot be cancelled.`);
    }

    // 3. Mark the withdrawal as Cancelled in the main collection
    withdrawal.status = 'Cancelled';
    await withdrawal.save();

    // 4. Update the embedded withdrawal record in the User document AND refund chips
    const userWithdrawalIndex = req.user.withdrawals.findIndex(w => w._id.toString() === withdrawId);

    if (userWithdrawalIndex !== -1) {
      req.user.withdrawals[userWithdrawalIndex].status = 'Cancelled';
      const amountToRefund = withdrawal.amount;
      req.user.chips += amountToRefund;
      await req.user.save();
      console.log(`5. Successfully cancelled and refunded ৳${amountToRefund}.`);
    } else {
      console.error(`5. [INCONSISTENCY] Embedded record ${withdrawId} not found in user subdocument. Refunding anyway.`);
      // Ensure refund still happens even if the subdocument is missing
      req.user.chips += withdrawal.amount;
      await req.user.save();
    }

    console.log(`--- CANCELLATION DEBUG END ---`);
    res.redirect('/dashboard?section=withdraw');

  } catch (err) {
    console.error('Withdrawal cancellation failed:', err);
    console.log(`--- CANCELLATION DEBUG END ---`);
    if (err.name === 'CastError') {
      return res.status(400).send('Invalid Withdrawal ID format.');
    }
    res.status(500).send('Cancellation failed due to a server error.');
  }
});

module.exports = router;