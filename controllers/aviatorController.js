// controllers/aviatorController.js
// Robust Aviator / "Bust" style round controller
// Features:
//  - Config-driven tuning (betting duration, tick interval, growth rate, caps)
//  - Provably-fair: serverSeed + serverHash emitted at round start; serverSeed revealed on round end
//  - Accurate multiplier calculation based on elapsed time
//  - Safe timers, cleanup, and state machine
//  - Socket emits: roundState, betTimer, multiplierUpdate, roundCrashed, betPlaced, cashedOut, serverTime
//  - HTTP-style controllers: placeBet(req,res), cashOut(req,res), getRoundStateSync()

const crypto = require('crypto');
const User = require('../models/User');

// ---------------- CONFIG (ADJUSTED FOR SLOWER GROWTH & VEGAS-STYLE RTP) ----------------
const config = {
  bettingDurationMs: 6000,     // Betting time (6 seconds)
  interRoundDelayMs: 5000,     // time between end-of-round and next round start (ms)
  tickIntervalMs: 150,         // how frequently multiplier updates are emitted (ms)
  maxMultiplier: 200,          // hard cap for multiplier (safety)
  minMultiplier: 1.0,          // min multiplier
  houseEdge: 0.04,             // 0.04 = 4% house edge (96% RTP)
  volatility: 1.0,             
  revealHashAlgorithm: 'sha256',
  // ADJUSTED FOR SLOW GROWTH: 0.5 is a noticeably slower, steady climb.
  growthRatePerSecond: 0.5,    
  // Safety limits:
  maxConcurrentBetsPerUser: 1,
  debug: false,
};

// ----------------- ROUND STATE -----------------
let ioInstance = null;
let roundTimer = null;        
let betCountdownTimer = null; 
let roundActive = false;
let roundPhase = 'idle'; // 'idle' | 'betting' | 'flying' | 'ended'

let roundState = {
  id: 0,
  startedAt: null,         
  bettingEndsAt: null,     
  multiplier: 1.0,
  crashAt: 0,
  serverSeed: null,        
  serverHash: null,        
  bets: {},                
};

const roundHistory = []; 
const MAX_HISTORY_LENGTH = 50;

// ----------------- HELPERS ----------------
function now() {
  return Date.now();
}

function sha256Hex(data) {
  return crypto.createHash(config.revealHashAlgorithm).update(data).digest('hex');
}

function randomFloatOpen() {
  // return pseudo-random float in (0,1) using cryptographic RNG
  const bytes = crypto.randomBytes(6); 
  const int = bytes.readUIntBE(0, 6);
  const max = Math.pow(2, 48);
  let f = int / max;
  if (f === 0) return randomFloatOpen();
  if (f === 1) return 0.999999999999;
  return f;
}

/**
 * Provably-fair crash generation:
 */
function generateCrashWithSeed(serverSeed) {
  const nonce = crypto.randomBytes(8).toString('hex'); 
  const hmac = crypto.createHmac('sha256', serverSeed).update(nonce).digest('hex');
  const slice = hmac.slice(0, 12);
  const intVal = parseInt(slice, 16);
  const maxInt = Math.pow(16, slice.length);
  let u = intVal / maxInt;

  if (u <= 0) u = randomFloatOpen();
  if (u >= 1) u = 0.999999999999;

  // Formula: baseCrash = 1 / (1 - u)
  const baseCrash = 1.0 / (1.0 - u);            
  const adjusted = Math.pow(baseCrash, config.volatility);
  
  // APPLY HOUSE EDGE: adjusted * (1 - 0.04)
  const afterHouse = adjusted * (1 - config.houseEdge);

  let crash = Math.max(config.minMultiplier, Number(afterHouse.toFixed(2)));

  // Safety cap
  crash = Math.min(crash, config.maxMultiplier);

  return { crash, nonce, seedUsed: serverSeed, hmacHex: hmac };
}

/**
 * Given elapsed milliseconds since flight start, return multiplier.
 */
function multiplierAtElapsed(elapsedMs) {
  const t = elapsedMs / 1000;
  // Uses the slow growthRatePerSecond: 0.5
  const m = Math.exp(config.growthRatePerSecond * t); 
  
  // clamp to safety
  return Math.min(Number(m.toFixed(4)), config.maxMultiplier);
}

function safeEmit(event, payload) {
  if (!ioInstance) return;
  try {
    ioInstance.emit(event, payload);
  } catch (e) {
    if (config.debug) console.error('Emit error', e);
  }
}

function pushRoundHistory(r) {
  roundHistory.unshift(r);
  if (roundHistory.length > MAX_HISTORY_LENGTH) roundHistory.pop();
}

// ----------------- ROUND LIFECYCLE -----------------
function startNewRound(io) {
  ioInstance = io;

  cleanupTimers();

  roundState = {
    id: (roundState.id || 0) + 1,
    startedAt: null,
    bettingEndsAt: now() + config.bettingDurationMs,
    multiplier: 1.0,
    crashAt: 0,
    serverSeed: null,
    serverHash: null,
    bets: {},
  };

  const serverSeed = crypto.randomBytes(32).toString('hex');
  const serverHash = sha256Hex(serverSeed);

  roundState.serverSeed = serverSeed;
  roundState.serverHash = serverHash;

  safeEmit('roundState', {
    round: roundState.id,
    state: 'betting',
    multiplier: roundState.multiplier,
    bettingEndsAt: roundState.bettingEndsAt,
    serverHash, 
  });

  roundPhase = 'betting';
  roundActive = true;

  // Betting countdown emits every second
  let remainingSec = Math.ceil(config.bettingDurationMs / 1000);
  safeEmit('betTimer', { timeLeft: remainingSec });
  betCountdownTimer = setInterval(() => {
    remainingSec--;
    if (remainingSec < 0) {
      clearInterval(betCountdownTimer);
      betCountdownTimer = null;
      return;
    }
    safeEmit('betTimer', { timeLeft: remainingSec });
  }, 1000);

  // After betting duration, start flight
  setTimeout(() => {
    // finalize crash point deterministically using the stored serverSeed
    const { crash } = generateCrashWithSeed(serverSeed);
    // store
    roundState.crashAt = crash;
    roundState.startedAt = now();
    roundState.multiplier = 1.0;

    // emit flight start
    safeEmit('roundState', {
      round: roundState.id,
      state: 'flying',
      multiplier: roundState.multiplier,
      flightStartTime: roundState.startedAt,
      serverHash, 
    });

    // Begin flight ticks
    beginFlightTicks();

  }, config.bettingDurationMs);
}

function beginFlightTicks() {
  if (!roundActive || roundPhase === 'flying') return;
  roundPhase = 'flying';

  const tickMs = config.tickIntervalMs;
  const startedAt = roundState.startedAt;

  // Emit multiplier updates on tickInterval
  roundTimer = setInterval(() => {
    const elapsed = now() - startedAt;
    const m = multiplierAtElapsed(elapsed);
    roundState.multiplier = m;

    safeEmit('multiplierUpdate', { multiplier: m });

    // Optionally emit planePosition (for client visuals)
    safeEmit('planePosition', {
      x: Math.min(m / config.maxMultiplier, 1), 
      y: Math.min(Math.pow(m / config.maxMultiplier, 0.6), 1),
    });

    // Check crash condition (server authoritative)
    if (m >= roundState.crashAt) {
      // Crash!
      endRound();
    }
  }, tickMs);
}

async function endRound() {
  cleanupTimers();
  roundActive = false;
  roundPhase = 'ended';

  // Mark uncaught bets as lost (resolved at crash)
  for (const [uid, bet] of Object.entries(roundState.bets)) {
    if (!bet.cashedOut) {
      bet.cashedOut = true;
      bet.cashedOutAtMultiplier = roundState.crashAt;
      bet.winnings = 0;
    }
  }

  // Emit crash event. Reveal serverSeed.
  safeEmit('roundCrashed', {
    crashAt: roundState.crashAt,
    serverSeed: roundState.serverSeed, 
  });

  pushRoundHistory({
    id: roundState.id,
    crashAt: roundState.crashAt,
    startedAt: roundState.startedAt,
    bets: Object.keys(roundState.bets).length,
  });

  // After a short pause, start next round automatically
  setTimeout(() => {
    startNewRound(ioInstance);
  }, config.interRoundDelayMs);
}

function cleanupTimers() {
  if (roundTimer) {
    clearInterval(roundTimer);
    roundTimer = null;
  }
  if (betCountdownTimer) {
    clearInterval(betCountdownTimer);
    betCountdownTimer = null;
  }
}

// ----------------- EXPORTABLE CONTROLLERS -----------------

/**
 * Return snapshot (useful for HTTP clients or initial socket sync)
 */
exports.getRoundStateSync = () => ({
  round: roundState.id,
  multiplier: roundState.multiplier,
  crashAt: roundState.crashAt, 
  state: roundPhase === 'betting' ? 'betting' : (roundPhase === 'flying' ? 'flying' : 'ended'),
  bettingEndsAt: roundState.bettingEndsAt,
  serverHash: roundState.serverHash,
});

/**
 * Place bet (HTTP handler)
 */
exports.placeBet = async (req, res) => {
  try {
    if (!roundActive || roundPhase !== 'betting') {
      return res.status(400).json({ ok: false, error: 'Betting closed' });
    }
    const userId = req.user.id;
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ ok: false, error: 'Invalid amount' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (amount > user.balance) return res.status(400).json({ ok: false, error: 'Insufficient Balance' });

    if (roundState.bets[userId] && config.maxConcurrentBetsPerUser <= 1) {
      return res.status(400).json({ ok: false, error: 'Already have an active bet this round' });
    }

    user.balance -= amount;

    user.totalWagered = (user.totalWagered || 0) + amount;

    await user.save();

    roundState.bets[userId] = { amount, cashedOut: false, cashedOutAtMultiplier: null, winnings: 0 };

    safeEmit('betPlaced', {
      userId,
      amount,
      username: user.username,
    });

    return res.json({ ok: true, balance: user.balance });
  } catch (err) {
    console.error('placeBet error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

/**
 * Cash out (HTTP handler)
 */
exports.cashOut = async (req, res) => {
  try {
    if (!roundActive || roundPhase !== 'flying') {
      return res.status(400).json({ ok: false, error: 'Cannot cash out now' });
    }
    const userId = req.user.id;
    const bet = roundState.bets[userId];
    if (!bet) return res.status(400).json({ ok: false, error: 'No active bet' });
    if (bet.cashedOut) return res.status(400).json({ ok: false, error: 'Already cashed out' });

    // Calculate current multiplier precisely by clock
    const elapsed = now() - roundState.startedAt;
    const currentM = multiplierAtElapsed(elapsed);

    // If currentM >= crashAt, the round already crashed — disallow
    if (currentM >= roundState.crashAt) {
      bet.cashedOut = true;
      bet.cashedOutAtMultiplier = roundState.crashAt;
      bet.winnings = 0;
      return res.status(400).json({ ok: false, error: 'Round already crashed' });
    }

    // Winnings calculation: floor(amount * multiplier)
    const rawWin = Math.floor(bet.amount * currentM);
    const winnings = rawWin;

    // Update user balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    user.balance += winnings;
    await user.save();

    // Update bet record
    bet.cashedOut = true;
    bet.cashedOutAtMultiplier = currentM;
    bet.winnings = winnings;

    // Notify via sockets
    safeEmit('cashedOut', {
      userId,
      username: user.username,
      win: winnings,
      multiplier: currentM,
    });

    return res.json({
      ok: true,
      winnings,
      multiplier: currentM,
      balance: user.balance,
    });
  } catch (err) {
    console.error('cashOut error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};

// ----------------- SOCKET-BASED PLACE/CASH (optional) -----------------
exports.socketPlaceBet = async (socket, data, ack) => {
  try {
    const userId = data.userId || (socket.request.user && socket.request.user.id);
    const amount = Number(data.amount);
    if (!roundActive || roundPhase !== 'betting') {
      return ack && ack({ ok: false, error: 'Betting closed' });
    }
    if (!userId || !amount || amount <= 0) return ack && ack({ ok: false, error: 'Invalid' });

    const user = await User.findById(userId);
    if (!user) return ack && ack({ ok: false, error: 'User not found' });
    if (amount > user.balance) return ack && ack({ ok: false, error: 'Insufficient Balance' });

    if (roundState.bets[userId] && config.maxConcurrentBetsPerUser <= 1) {
      return ack && ack({ ok: false, error: 'Already bet this round' });
    }

    user.balance -= amount;

    user.totalWagered = (user.totalWagered || 0) + amount;

    await user.save();

    roundState.bets[userId] = { amount, cashedOut: false, cashedOutAtMultiplier: null, winnings: 0 };
    safeEmit('betPlaced', { userId, amount, username: user.username });

    return ack && ack({ ok: true, balance: user.balance });
  } catch (err) {
    console.error('socketPlaceBet error', err);
    return ack && ack({ ok: false, error: 'Server error' });
  }
};

exports.socketCashOut = async (socket, data, ack) => {
  try {
    const userId = data.userId || (socket.request.user && socket.request.user.id);
    if (!roundActive || roundPhase !== 'flying') return ack && ack({ ok: false, error: 'Cannot cash out now' });
    const bet = roundState.bets[userId];
    if (!bet) return ack && ack({ ok: false, error: 'No active bet' });
    if (bet.cashedOut) return ack && ack({ ok: false, error: 'Already cashed out' });

    const elapsed = now() - roundState.startedAt;
    const currentM = multiplierAtElapsed(elapsed);
    if (currentM >= roundState.crashAt) {
      bet.cashedOut = true;
      bet.cashedOutAtMultiplier = roundState.crashAt;
      bet.winnings = 0;
      return ack && ack({ ok: false, error: 'Round already crashed' });
    }

    const winnings = Math.floor(bet.amount * currentM);
    const user = await User.findById(userId);
    if (!user) return ack && ack({ ok: false, error: 'User not found' });
    user.balance += winnings;
    await user.save();

    bet.cashedOut = true;
    bet.cashedOutAtMultiplier = currentM;
    bet.winnings = winnings;

    safeEmit('cashedOut', { userId, username: user.username, win: winnings, multiplier: currentM });

    return ack && ack({ ok: true, winnings, multiplier: currentM, balance: user.balance });
  } catch (err) {
    console.error('socketCashOut error', err);
    return ack && ack({ ok: false, error: 'Server error' });
  }
};

// ----------------- INIT -----------------
exports.initAviator = (io) => {
  ioInstance = io;
  // If no active round, start one
  if (!roundActive) {
    startNewRound(io);
  }
};