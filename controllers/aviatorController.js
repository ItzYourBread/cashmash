// controllers/aviatorController.js
const User = require('../models/User');

// ----------------- LIVE ROUND STATE -----------------
let roundState = {
  round: 1,
  multiplier: 1,
  crashAt: 0,
  bets: {}, // { userId: { amount, cashedOut } }
};

let roundInterval = null;
let roundActive = false;
let bettingPhase = true;
let ioInstance = null;

// ----------------- ROUND LOGIC -----------------
function startNewRound(io) {
  ioInstance = io;
  roundActive = true;
  bettingPhase = true;
  roundState.multiplier = 1;
  roundState.crashAt = generateCrashPoint();
  roundState.bets = {};

  io.emit("roundState", {
    round: roundState.round,
    state: "betting",
    multiplier: roundState.multiplier,
    flightStartTime: !bettingPhase ? Date.now() - (roundState.multiplier - 1) * 2 : null
  });

  // ---- Betting phase (5s) ----
  let betTimeLeft = 5;
  const betTimer = setInterval(() => {
    io.emit("betTimer", { timeLeft: betTimeLeft });
    betTimeLeft--;
    if (betTimeLeft < 0) clearInterval(betTimer);
  }, 1000);

  setTimeout(() => {
    bettingPhase = false;
    io.emit("roundState", {
      round: roundState.round,
      state: "flying",
      multiplier: roundState.multiplier,
    });

    // ---- Start flight phase ----
    startFlight(io);
  }, 5000);
}

function generateCrashPoint() {
  // Use an exponential distribution for more realistic crashes
  const r = Math.random();
  const crash = 1.0 / (1.0 - r);
  const capped = Math.min(parseFloat(crash.toFixed(2)), 20);
  return capped;
}

function startFlight(io) {
  let speed = 0.05; // multiplier increment speed
  roundInterval = setInterval(() => {
    if (!roundActive) return;

    // Simulate exponential growth
    roundState.multiplier = parseFloat((roundState.multiplier * 1.02).toFixed(2));
    io.emit("multiplierUpdate", {
      multiplier: roundState.multiplier,
    });

    // Emit plane position (for curve animation)
    io.emit("planePosition", {
      x: roundState.multiplier * 10,
      y: Math.pow(roundState.multiplier, 1.4) * 2,
    });

    if (roundState.multiplier >= roundState.crashAt) {
      endRound(io);
    }
  }, 150);
}

async function endRound(io) {
  clearInterval(roundInterval);
  roundActive = false;

  // Mark uncaught bets as lost
  for (const [uid, bet] of Object.entries(roundState.bets)) {
    if (!bet.cashedOut) bet.cashedOut = true;
  }

  io.emit("roundCrashed", { crashAt: roundState.crashAt });



  roundState.round++;

  // Wait before next round
  setTimeout(() => startNewRound(io), 5000);
}

// ----------------- CONTROLLERS -----------------

exports.getRoundStateSync = () => ({
  round: roundState.round,
  multiplier: roundState.multiplier,
  crashAt: roundState.crashAt,
  state: bettingPhase ? "betting" : "flying",
});

// ----------------- PLACE BET -----------------
exports.placeBet = async (req, res) => {
  try {
  // (debug logs removed)
    if (!roundActive || !bettingPhase)
      return res.status(400).json({ ok: false, error: "Betting closed" });

    const userId = req.user.id;
    const { amount } = req.body;

    const user = await User.findById(userId);
  // user lookup
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });
    if (amount > user.chips)
      return res.status(400).json({ ok: false, error: "Insufficient chips" });

    user.chips -= amount;
    await user.save();

    roundState.bets[userId] = { amount, cashedOut: false };

    ioInstance.emit("betPlaced", {
      userId,
      amount,
      username: user.username,
    });

    res.json({ ok: true, balance: user.chips });
  } catch (err) {
    console.error("Place bet error", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ----------------- CASH OUT -----------------
exports.cashOut = async (req, res) => {
  try {
    if (!roundActive || bettingPhase)
      return res.status(400).json({ ok: false, error: "Cannot cash out yet" });

    const userId = req.user.id;
    const betData = roundState.bets[userId];
    if (!betData) return res.status(400).json({ ok: false, error: "No active bet" });
    if (betData.cashedOut) return res.status(400).json({ ok: false, error: "Already cashed out" });

    const currentMultiplier = roundState.multiplier;
    const winnings = Math.floor(betData.amount * currentMultiplier);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    user.chips += winnings;
    await user.save();

    betData.cashedOut = true;

    ioInstance.emit("cashedOut", {
      userId,
      username: user.username,
      win: winnings,
      multiplier: currentMultiplier,
    });

    res.json({
      ok: true,
      winnings,
      multiplier: currentMultiplier,
      balance: user.chips,
    });
  } catch (err) {
    console.error("Cashout error", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
};

// ----------------- INIT -----------------
exports.initAviator = (io) => {
  if (!roundActive) startNewRound(io);
};
