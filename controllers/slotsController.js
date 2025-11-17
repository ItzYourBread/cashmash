const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User');

// --- GLOBAL SETTINGS ---
let slotType = 'ClassicSlot';
const BASE_RTP = 0.92; // 🎯 Base RTP for all slots
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- SET SLOT TYPE ---
const setSlotType = (req) => {
  const type = req.query.type;
  if (type && slotsConfig[type]) slotType = type;
};

// --- RANDOM SYMBOL PICKER ---
const getRandomSymbol = (config) => {
  const symbols = config._weightedSymbols;
  return symbols[Math.floor(Math.random() * symbols.length)];
};

// --- BUILD WEIGHTED SYMBOL CACHE ---
const buildWeightedSymbols = (config) => {
  if (config._weightedSymbols) return config;
  const weighted = [];
  const chances = config.symbolChances || {};
  for (const sym of config.symbols) {
    const weight = chances[sym.name] || 1;
    for (let i = 0; i < weight; i++) weighted.push(sym);
  }
  config._weightedSymbols = weighted;
  return config;
};

// --- DYNAMIC CONFIG (includes Lucky Day) ---
const getDynamicConfig = () => {
  const baseConfig = slotsConfig[slotType];
  const today = new Date();
  const isLuckyDay = today.getDay() === 0 || today.getDay() === 1; // Sunday=0, Monday=1
  const payoutBoost = isLuckyDay ? 1.1 : 1.0; // +10% payouts

  const symbols = baseConfig.symbols.map(sym => ({
    ...sym,
    multiplier: sym.multiplier * BASE_RTP * payoutBoost,
  }));

  return buildWeightedSymbols({
    ...baseConfig,
    symbols,
    isLuckyDay,
  });
};

// --- PAYLINES CACHE ---
const cacheValidPaylines = (config) => {
  if (config._validPaylines) return config;
  config._validPaylines = (config.paylines || []).filter(line =>
    Array.isArray(line) &&
    line.length === config.reels &&
    line.every(i => Number.isInteger(i) && i >= 0 && i < config.rows)
  );
  return config;
};

// --- WIN CALCULATION ---
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

// --- MAIN SPIN ---
exports.spin = async (req, res) => {
  const bet = +req.body.bet || 0;
  if (bet < 0.1) return res.status(400).json({ error: 'Invalid bet' });

  try {
    setSlotType(req);
    let config = getDynamicConfig();
    config = cacheValidPaylines(config);

    const user = await User.findById(req.user.id).lean(false);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.balance) return res.status(400).json({ error: 'Insufficient balance' });

    user.balance -= bet;

    // --- GENERATE SYMBOL MATRIX ---
    const matrix = Array.from({ length: config.reels }, () =>
      Array.from({ length: config.rows }, () => getRandomSymbol(config))
    );

    // --- BASE WIN CALC ---
    let { totalWin, finalSymbols } = calculateWinnings(matrix, bet, config);

    // --- BONUS LOGIC ---
    let dragonEyeBonus = 0;
    let pharaohBonus = 0;

    for (const reel of finalSymbols) {
      for (const sym of reel) {
        if (sym.name === "dragonEye") dragonEyeBonus += bet * 0.10;
        if (sym.name === "pharaoh") pharaohBonus += bet * 0.05;
      }
    }

    totalWin += dragonEyeBonus + pharaohBonus;

    // --- UPDATE BALANCE ---
    user.balance += totalWin;

    // --- HISTORY LOG ---
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
      balance: user.balance,
      isLuckyDay: config.isLuckyDay,
      rtp: BASE_RTP,
    });
  } catch (err) {
    console.error("🔥 Spin error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// --- SIMULATION MODE (RTP-only, Sunday/Monday bonus applied) ---
exports.simulate = async (req, res) => {
  try {
    setSlotType(req); // Set slot type from query
    let config = getDynamicConfig(); // Includes Sunday/Monday payout boost
    config = cacheValidPaylines(config); // Ensure _validPaylines exists

    let balance = 100; // Starting simulation balance (USD)
    const bet = 0.5;      // Default bet per spin
    let spinCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWagered = 0;
    let highestBalance = balance;
    let biggestWin = 0;

    console.log(`🎮 Simulation starting for ${slotType}`);
    console.log(`💰 Starting balance: ${balance} USD`);
    console.log(`🎯 Sunday/Monday payout boost: ${config.isLuckyDay ? "YES" : "NO"}`);

    // Keep spinning until balance drops below threshold
    while (balance >= 10000) {
      spinCount++;
      totalWagered += bet;

      // --- Generate random symbols matrix ---
      const symbolsMatrix = Array.from({ length: config.reels }, () =>
        Array.from({ length: config.rows }, () => {
          const sym = getRandomSymbol(config);
          return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
        })
      );

      // --- Calculate winnings for this spin ---
      const { totalWin } = calculateWinnings(symbolsMatrix, bet, config);

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
        console.log(`🌀 Spins: ${spinCount}, Balance: ${balance.toFixed(2)}, RTP: ${(balance / totalWagered).toFixed(3)}`);
      }
    }

    const netResult = balance - 50000;
    const rtp = totalWagered ? (balance / totalWagered).toFixed(3) : "0.000";

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
        effectiveRTP: rtp,
        isLuckyDay: config.isLuckyDay
      }
    });

  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed' });
  }
};
