const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User');

// --- GLOBAL SETTINGS ---
let slotType = 'ClassicSlot';

// RTP Configuration
const RTP_MIN = 0.85;
const RTP_MAX = 0.92;
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- HELPER: GET HOURLY RTP ---
// This generates a deterministic "random" number based on the current hour.
// It guarantees the RTP stays the same for the whole hour, then changes.
const getHourlyRTP = () => {
  const now = new Date();
  // Create a unique seed integer for this specific hour (e.g., 2023102514)
  const seed = parseInt(
    `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}${now.getHours()}`
  );
  
  // Simple pseudo-random number generator using sine wave based on the seed
  // (Math.sin returns -1 to 1, we normalize it to 0 to 1)
  const x = Math.sin(seed) * 10000;
  const randomFactor = x - Math.floor(x); 

  // Scale to range [0.85, 0.92]
  const currentRTP = RTP_MIN + (randomFactor * (RTP_MAX - RTP_MIN));
  
  console.log(`🕒 Hourly RTP for hour ${seed}: ${currentRTP.toFixed(4)}`);
  // Return with 4 decimal precision (e.g., 0.8743)
  return parseFloat(currentRTP.toFixed(4));
};

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

// --- DYNAMIC CONFIG (includes Lucky Day & Hourly RTP) ---
const getDynamicConfig = () => {
  const baseConfig = slotsConfig[slotType];
  const today = new Date();
  const isLuckyDay = today.getDay() === 0 || today.getDay() === 1; // Sun/Mon
  const payoutBoost = isLuckyDay ? 1.1 : 1.0; // +10% payouts
  
  // CALCULATE CURRENT HOURLY RTP
  const currentBaseRTP = getHourlyRTP(); 

  const symbols = baseConfig.symbols.map(sym => ({
    ...sym,
    // Apply Hourly RTP * Lucky Day Boost
    multiplier: sym.multiplier * currentBaseRTP * payoutBoost,
  }));

  return buildWeightedSymbols({
    ...baseConfig,
    symbols,
    isLuckyDay,
    currentBaseRTP, // Store this to send back to client
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
    
    // Config now contains the dynamic Hourly RTP
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
      rtp: config.currentBaseRTP, // Returns the specific RTP for this hour (0.85-0.92)
    });
  } catch (err) {
    console.error("🔥 Spin error:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// --- SIMULATION MODE (fixed-spin or until bankrupt) ---
exports.simulate = async (req, res) => {
  try {
    setSlotType(req);                  // set slot type from query
    let config = getDynamicConfig();   // includes Sunday/Monday payout boost
    config = cacheValidPaylines(config);

    // Configurable simulation params (via query)
    const SPINS = Math.max(1, parseInt(req.query.spins, 10) || 100000); // default 100k spins
    const START_BALANCE = parseFloat(req.query.start) || 10000.0;         // default $100
    const BET = parseFloat(req.query.bet) || 100;                       // default $0.50 per spin
    const LOG_EVERY = Math.max(100, parseInt(req.query.logEvery, 10) || 1000); // logging frequency

    let balance = START_BALANCE;
    let spinCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWagered = 0;
    let totalPayout = 0;
    let highestBalance = balance;
    let biggestWin = 0;

    console.log(`🎮 Simulation starting for ${slotType}`);
    console.log(`💰 Start balance: ${START_BALANCE}, bet: ${BET}, planned spins: ${SPINS}`);
    console.log(`🎯 Sunday/Monday payout boost: ${config.isLuckyDay ? "YES" : "NO"}`);

    for (let i = 0; i < SPINS; i++) {
      // Stop early if bankroll < bet
      if (balance < BET) break;

      spinCount++;
      totalWagered += BET;

      // --- Generate random symbols matrix (reels x rows) ---
      const symbolsMatrix = Array.from({ length: config.reels }, () =>
        Array.from({ length: config.rows }, () => {
          const sym = getRandomSymbol(config);
          return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
        })
      );

      // --- Calculate winnings for this spin ---
      const { totalWin } = calculateWinnings(symbolsMatrix, BET, config);

      // Apply bet and result
      balance -= BET;
      balance += totalWin;

      totalPayout += totalWin;

      if (totalWin > 0) {
        totalWins++;
        if (totalWin > biggestWin) biggestWin = totalWin;
      } else {
        totalLosses++;
      }

      if (balance > highestBalance) highestBalance = balance;

      // occasional logging to avoid huge console spam
      if (spinCount % LOG_EVERY === 0) {
        console.log(`🌀 Spins: ${spinCount}, Balance: ${balance.toFixed(4)}, RTP so far: ${(totalPayout / totalWagered).toFixed(4)}`);
      }
    }

    const finalBalance = balance;
    const netResult = finalBalance - START_BALANCE;
    const effectiveRTP = totalWagered ? (totalPayout / totalWagered) : 0;

    console.log('--- Simulation Complete ---');
    console.log(`🧾 Spins played: ${spinCount}`);
    console.log(`🏆 Total Wins: ${totalWins}`);
    console.log(`💀 Total Losses: ${totalLosses}`);
    console.log(`📈 Highest Balance: ${highestBalance.toFixed(4)}`);
    console.log(`💸 Biggest Win: ${biggestWin.toFixed(4)}`);
    console.log(`💰 Final Balance: ${finalBalance.toFixed(4)}`);
    console.log(`📉 Net Result: ${netResult.toFixed(4)}`);
    console.log(`🎯 Effective RTP: ${effectiveRTP.toFixed(4)}`);
    

    res.json({
      ok: true,
      summary: {
        slotType,
        plannedSpins: SPINS,
        spinsPlayed: spinCount,
        totalWagered: Number(totalWagered.toFixed(4)),
        totalPayout: Number(totalPayout.toFixed(4)),
        effectiveRTP: Number(effectiveRTP.toFixed(4)),
        totalWins,
        totalLosses,
        highestBalance: Number(highestBalance.toFixed(4)),
        biggestWin: Number(biggestWin.toFixed(4)),
        finalBalance: Number(finalBalance.toFixed(4)),
        netResult: Number(netResult.toFixed(4)),
        isLuckyDay: config.isLuckyDay
      }
    });

  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed' });
  }
};