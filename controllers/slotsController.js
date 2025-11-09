// controllers/slotsController.js
const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User');

// --- GLOBALS ---
let slotType = 'ClassicSlot';
const TARGET_RTP = 0.92;
const HOUSE_EDGE = 1 - TARGET_RTP;
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- SET SLOT TYPE ---
const setSlotType = (req) => {
  const type = req.query.type;
  if (type && slotsConfig[type]) slotType = type;
};

// --- PRE-CACHED RANDOM GENERATOR (avoids array re-creation every call) ---
const getRandomSymbol = (config) => {
  const symbols = config._weightedSymbols;
  return symbols[Math.floor(Math.random() * symbols.length)];
};

// --- CONFIG CACHE BUILDER ---
const buildWeightedSymbols = (config) => {
  if (config._weightedSymbols) return config; // Cached
  const weighted = [];
  const symbolChances = config.symbolChances || {};
  for (const sym of config.symbols) {
    const weight = symbolChances[sym.name] || 1;
    for (let i = 0; i < weight; i++) weighted.push(sym);
  }
  config._weightedSymbols = weighted;
  return config;
};

// --- DYNAMIC CONFIGURATION ---
const getDynamicConfig = () => {
  const today = new Date();
  const isLuckyDay = today.getDay() <= 1; // Sunday/Monday
  const baseConfig = slotsConfig[slotType];
  const payoutBoost = isLuckyDay ? 1.1 : 1.0;
  const adjust = 1 - (HOUSE_EDGE / 2);

  // Avoid deep cloning, reuse structure
  const symbols = baseConfig.symbols.map(sym => ({
    ...sym,
    multiplier: sym.multiplier * payoutBoost * adjust
  }));

  return buildWeightedSymbols({ ...baseConfig, symbols, isLuckyDay });
};

// --- WIN CALCULATION (tight loop optimized) ---
const calculateWinnings = (matrix, bet, config) => {
  const paylines = config._validPaylines;
  let totalWin = 0;
  const final = matrix.map(r => r.map(s => ({ ...s, win: false })));

  for (const line of paylines) {
    const first = matrix[0][line[0]];
    let symbolName = first.name;
    let match = 1;

    for (let r = 1; r < config.reels; r++) {
      const sym = matrix[r][line[r]];
      if (sym.name !== symbolName) break;
      match++;
    }

    if (match >= 3) {
      const win = bet * first.multiplier * (PAYOUT_FACTORS[match] || 0);
      totalWin += win;
      for (let r = 0; r < match; r++) final[r][line[r]].win = true;
    }
  }

  return { totalWin, finalSymbols: final };
};

// --- VALID PAYLINES CACHE ---
const cacheValidPaylines = (config) => {
  if (config._validPaylines) return config;
  config._validPaylines = (config.paylines || []).filter(line =>
    Array.isArray(line) &&
    line.length === config.reels &&
    line.every(i => Number.isInteger(i) && i >= 0 && i < config.rows)
  );
  return config;
};

// --- MAIN SPIN ---
exports.spin = async (req, res) => {
  const bet = +req.body.bet || 0;
  if (bet < 1) return res.status(400).json({ error: 'Invalid bet' });

  try {
    setSlotType(req);
    let config = getDynamicConfig();
    config = cacheValidPaylines(config);

    const user = await User.findById(req.user.id).lean(false);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient balance' });

    user.chips -= bet;
    user.spinsSinceLastSmallWin = (user.spinsSinceLastSmallWin || 0) + 1;
    user.totalWagered = (user.totalWagered || 0) + bet;
    user.losingStreak = user.losingStreak || 0;
    user.comebackSpinsLeft = user.comebackSpinsLeft || 0;

    // --- MATRIX GENERATION (optimized) ---
    const matrix = Array.from({ length: config.reels }, () =>
      Array.from({ length: config.rows }, () => {
        const sym = getRandomSymbol(config);
        return sym;
      })
    );

    // --- WINNING CALC ---
    let { totalWin, finalSymbols } = calculateWinnings(matrix, bet, config);

    // --- BONUSES ---
    let dragonEyeBonus = 0;
    let pharaohBonus = 0;

    for (const reel of finalSymbols) {
      for (const sym of reel) {
        if (sym.name === "dragonEye") dragonEyeBonus += bet * 0.10; // 10% per Dragon Eye
        if (sym.name === "pharaoh") pharaohBonus += bet * 0.05;    // 5% per Pharaoh
      }
    }

    totalWin += dragonEyeBonus + pharaohBonus;

    // --- RNG + Comeback logic ---
    const { MIN, MAX } = config.baseWinRate;
    let winThreshold = MIN + Math.random() * (MAX - MIN);
    if (user.comebackSpinsLeft > 0) {
      winThreshold += 0.15 + Math.random() * 0.15;
      user.comebackSpinsLeft--;
    }
    winThreshold = Math.min(Math.max(winThreshold, 0.01), 0.99);

    const winRoll = Math.random();
    let isForcedWin = false;

    // --- Forced small win ---
    if (user.spinsSinceLastSmallWin >= 10 && totalWin === 0) {
      const smalls = config.symbols.filter(s => s.multiplier <= 1.5);
      if (smalls.length) {
        const sym = smalls[Math.floor(Math.random() * smalls.length)];
        const line = config.paylines[Math.floor(Math.random() * config.paylines.length)];
        for (let r = 0; r < 3; r++) matrix[r][line[r]] = sym;

        const recalc = calculateWinnings(matrix, bet, config);
        totalWin = recalc.totalWin;
        finalSymbols = recalc.finalSymbols;
        isForcedWin = true;
      }
      user.spinsSinceLastSmallWin = 0;
    }

    // --- RNG Override ---
if (!isForcedWin && totalWin - (dragonEyeBonus + pharaohBonus) > 0 && winRoll > winThreshold) {
  totalWin = dragonEyeBonus + pharaohBonus; // ✅ preserve both bonuses
  for (const reel of finalSymbols) for (const sym of reel) sym.win = false;
}


    // --- Balance Update ---
    user.chips += totalWin;

    if (totalWin > 0) user.losingStreak = 0;
    else if (++user.losingStreak >= 10 && !user.comebackSpinsLeft) {
      user.comebackSpinsLeft = 3 + Math.floor(Math.random() * 3);
      user.losingStreak = 0;
    }

    // --- Push Game History (minimal fields) ---
    user.gameHistory.push({
      gameType: slotType,
      betAmount: bet,
      multiplier: totalWin > 0 ? totalWin / bet : 0,
      winAmount: totalWin,
      result: totalWin > 0 ? "Win" : "Loss",
      playedAt: new Date(),
    });

    await user.save({ validateBeforeSave: false });

    res.json({
      ok: true,
      finalSymbols,
      winnings: totalWin,
      balance: user.chips,
      isLuckyDay: config.isLuckyDay,
      losingStreak: user.losingStreak,
      comebackSpinsLeft: user.comebackSpinsLeft,
      spinsSinceLastSmallWin: user.spinsSinceLastSmallWin,
    });
  } catch (err) {
    console.error("🔥 Spin error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- SIMULATION MODE ---
exports.simulate = async (req, res) => {
  try {
    setSlotType(req);
    const config = getDynamicConfig();

    let balance = 50000; // Starting test balance (BDT)
    const bet = 75; // Default bet per spin
    let spinCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWagered = 0;
    let highestBalance = balance;
    let biggestWin = 0;

    console.log(`🎮 Simulation starting for ${slotType}`);
    console.log(`💰 Starting balance: ${balance} BDT`);

    // Keep running until balance below 10,000
    while (balance >= 10000) {
      spinCount++;
      totalWagered += bet;

      // --- Generate reels
      const symbolsMatrix = Array(config.reels).fill(0).map(() =>
        Array(config.rows).fill(0).map(() => {
          const sym = getRandomSymbol(config);
          return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
        })
      );

      let { totalWin } = calculateWinnings(symbolsMatrix, bet, config);

      // --- Win RNG control
      const minRate = Math.min(config.baseWinRate.MIN, config.baseWinRate.MAX);
      const maxRate = Math.max(config.baseWinRate.MIN, config.baseWinRate.MAX);
      const winThreshold = minRate + Math.random() * ((maxRate - minRate) || 0.0001);
      const winRoll = Math.random();

      // RNG enforcement
      if (totalWin > 0 && winRoll > winThreshold) {
        totalWin = 0; // House advantage
      }

      // Apply result
      balance -= bet;
      balance += totalWin;
      if (totalWin > 0) {
        totalWins++;
        if (totalWin > biggestWin) biggestWin = totalWin;
      } else {
        totalLosses++;
      }

      if (balance > highestBalance) highestBalance = balance;

      // Optional logging every 100 spins
      if (spinCount % 100 === 0) {
        console.log(`🌀 Spins: ${spinCount}, Balance: ${balance.toFixed(2)}, RTP: ${(balance / 50000).toFixed(3)}`);
      }
    }

    const netResult = balance - 50000;
    const rtp = (balance / totalWagered).toFixed(3);

    console.log('--- Simulation Complete ---');
    console.log(`🧾 Spins: ${spinCount}`);
    console.log(`🏆 Total Wins: ${totalWins}`);
    console.log(`💀 Total Losses: ${totalLosses}`);
    console.log(`📈 Highest Balance: ${highestBalance}`);
    console.log(`💸 Biggest Win: ${biggestWin}`);
    console.log(`💰 Final Balance: ${balance}`);
    console.log(`📉 Net Result: ${netResult}`);
    console.log(`🎯 Effective RTP: ${rtp}`);

    res.json({
      ok: true,
      summary: {
        slotType,
        spins: spinCount,
        totalWins,
        totalLosses,
        highestBalance,
        biggestWin,
        finalBalance: balance,
        netResult,
        effectiveRTP: rtp
      }
    });

  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed' });
  }
};
