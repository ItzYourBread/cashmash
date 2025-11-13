const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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

// ----------------- DEPOSIT ROUTES -----------------
router.get('/deposit', (req, res) => {
  res.render('deposit', { user: req.user, currentPage: 'deposit', agentPayments });
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
    const { amount } = req.body;
    const usdAmount = Number(amount);

    if (!usdAmount || usdAmount < 1) {
      return res.status(400).send('Invalid amount');
    }

    // Create payment at NOWPayments
    const payment = await npApi.createInvoice({
      price_amount: usdAmount,
      price_currency: "usd",
      order_id: req.user._id.toString(),
      order_description: `Crypto deposit by ${req.user.username}`,
      ipn_callback_url: `${process.env.BASE_URL}/api/nowpayments/webhook`
    });


    console.log("NOWPayments Payment:", payment); // 🧠 inspect the returned fields

    // Use whichever ID field exists
    const txnId = payment.id || payment.payment_id || payment.invoice_id;
    if (!txnId) {
      console.warn("⚠️ NOWPayments did not return a payment ID");
      return res.status(500).send("Failed to create payment ID.");
    }

    // Create pending deposit
    const depositData = {
      user: req.user._id,
      amount: usdAmount * 122.24, // convert USD → BDT if needed
      amountUSD: usdAmount,
      method: "Crypto",
      txnId, // ✅ now guaranteed to exist
      status: "Pending"
    };

    req.user.deposits.push(depositData);
    await req.user.save();
    await Deposit.create(depositData);

    // Redirect to NOWPayments checkout page
    return res.redirect(payment.invoice_url);
  } catch (err) {
    console.error("NOWPayments error:", err);
    return res.status(500).send("Failed to create crypto payment.");
  }
});


// ✅ WEBHOOK: Handle NOWPayments notifications
router.post('/api/nowpayments/webhook', express.json(), async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    const body = req.body;

    // ✅ Verify IPN signature
    const crypto = require('crypto');
    const hmac = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hmac !== signature) {
      console.warn("⚠️ Invalid NOWPayments signature");
      return res.status(403).send('Invalid signature');
    }

    const { payment_id, payment_status, order_id, price_amount } = body;

    console.log("NOWPayments Webhook:", payment_status, payment_id);

    if (payment_status === 'waiting' || payment_status === 'waiting') {
      const userId = order_id;
      const user = await mongoose.model('User').findById(userId);
      const deposit = await Deposit.findOne({ txnId: payment_id });

      if (deposit && deposit.status !== 'Completed') {
        deposit.status = 'Completed';
        await deposit.save();

        // Reward user (e.g., add chips)
        const rewardAmount = deposit.amount; // BDT equivalent
        user.chips += rewardAmount;
        await user.save();

        console.log(`✅ User ${user.username} credited ৳${rewardAmount} from crypto payment.`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('NOWPayments webhook failed:', err);
    res.sendStatus(500);
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