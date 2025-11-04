const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User'); 

let slotType = 'ClassicSlot';

const setSlotType = (req) => {
  const type = req.query.type;
  if (type && slotsConfig[type]) slotType = type;
};

// --- CONFIG ---
const TARGET_RTP = 0.92; 
const HOUSE_EDGE = 1 - TARGET_RTP;
const MIN_WIN_RATE = 0.11;
const MAX_WIN_RATE = 0.34;
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- DYNAMIC CONFIGURATION ---
const getDynamicConfig = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const baseConfig = slotsConfig[slotType];
  let payoutBoostFactor = 1.0;

  if (dayOfWeek === 0 || dayOfWeek === 1) payoutBoostFactor = 1.1; // Lucky Day

  const houseAdjustment = 1 - (HOUSE_EDGE / 2);
  const dynamicSymbols = baseConfig.symbols.map(sym => ({
    ...sym,
    multiplier: sym.multiplier * payoutBoostFactor * houseAdjustment
  }));

  return { ...baseConfig, symbols: dynamicSymbols, isLuckyDay: payoutBoostFactor > 1.0 };
};

const getRandomSymbol = (config) => {
  const weighted = [];
  config.symbols.forEach(sym => {
    const weight = config.symbolChances?.[sym.name] || 1;
    for (let i = 0; i < weight; i++) weighted.push(sym);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
};

const calculateWinnings = (symbolsMatrix, bet, config) => {
  let totalWin = 0;
  const finalSymbols = symbolsMatrix.map(reel => reel.map(sym => ({ ...sym, win: false })));

  config.paylines.forEach(line => {
    let winLength = 0, currentSymbol = null;

    for (let r = 0; r < config.reels; r++) {
      const row = line[r];
      const symbol = finalSymbols[r][row];
      if (r === 0) {
        currentSymbol = symbol;
        winLength = 1;
      } else if (symbol.name === currentSymbol.name) winLength++;
      else break;
    }

    if (winLength >= 3) {
      const factor = PAYOUT_FACTORS[winLength] || 0;
      const lineWin = bet * currentSymbol.multiplier * factor;
      totalWin += lineWin;
      for (let r = 0; r < winLength; r++) {
        finalSymbols[r][line[r]].win = true;
      }
    }
  });

  return { totalWin, finalSymbols };
};

// ----------------- MAIN SPIN -----------------
exports.spin = async (req, res) => {
  try {
    setSlotType(req);
    const config = getDynamicConfig();
    const userId = req.user.id;
    const bet = parseInt(req.body.bet, 10);

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct bet
    user.chips -= bet;

    // Default streak setup if missing
    user.losingStreak = user.losingStreak || 0;
    user.comebackSpinsLeft = user.comebackSpinsLeft || 0;

    // --- Generate slot symbols ---
    const symbolsMatrix = [];
    for (let c = 0; c < config.reels; c++) {
      const col = [];
      for (let r = 0; r < config.rows; r++) {
        const sym = getRandomSymbol(config);
        col.push({ name: sym.name, file: sym.file, multiplier: sym.multiplier });
      }
      symbolsMatrix.push(col);
    }

    let { totalWin, finalSymbols } = calculateWinnings(symbolsMatrix, bet, config);

    // 🎯 --- BASE WIN CONTROL ---
    const winRoll = Math.random();
    let winThreshold = MIN_WIN_RATE + Math.random() * (MAX_WIN_RATE - MIN_WIN_RATE);

    // 💸 Low Balance Boost
    if (user.chips < 200) {
      const boost = 0.1 + Math.random() * 0.1;
      winThreshold += boost;
      console.log(`[SLOTS] Low-balance boost +${(boost * 100).toFixed(1)}% (<200)`);
    } else if (user.chips < 300) {
      const boost = 0.05 + Math.random() * 0.07;
      winThreshold += boost;
      console.log(`[SLOTS] Low-balance boost +${(boost * 100).toFixed(1)}% (<300)`);
    }

    // 🔥 Comeback Mode
    if (user.comebackSpinsLeft > 0) {
      const comebackBoost = 0.15 + Math.random() * 0.15;
      winThreshold += comebackBoost;
      user.comebackSpinsLeft -= 1;
      console.log(`[SLOTS] Comeback mode active! +${(comebackBoost * 100).toFixed(1)}% win chance`);
    }

    // Clamp threshold
    winThreshold = Math.min(winThreshold, 0.6);

    // Determine win/loss
    if (winRoll > winThreshold) totalWin = 0;

    // --- RTP Adjustment ---
    if (totalWin > 0 && Math.random() > TARGET_RTP) {
      const reduced = Math.floor(totalWin * (0.4 + Math.random() * 0.3));
      console.log(`[SLOTS] RTP Adjusted: ${totalWin} → ${reduced}`);
      totalWin = reduced;
    }

    // --- Visual near-win ---
    if (totalWin === 0 && Math.random() < 0.1) {
      finalSymbols[Math.floor(Math.random() * finalSymbols.length)][0].win = true;
    }

    // ✅ --- Update user ---
    user.chips += totalWin;
    user.totalWagered += bet;

    // Track streaks
    if (totalWin > 0) {
      console.log(`[SLOTS] Win! Streak reset.`);
      user.losingStreak = 0;
    } else {
      user.losingStreak++;
      console.log(`[SLOTS] Losing streak: ${user.losingStreak}`);
      if (user.losingStreak >= 10 && user.comebackSpinsLeft === 0) {
        user.comebackSpinsLeft = 3 + Math.floor(Math.random() * 3); // 3–5 boosted spins
        user.losingStreak = 0;
        console.log(`[SLOTS] Comeback mode triggered! Next ${user.comebackSpinsLeft} spins boosted.`);
      }
    }

    user.gameHistory.push({
      gameType: 'Slots',
      betAmount: bet,
      multiplier: totalWin > 0 ? totalWin / bet : 0,
      winAmount: totalWin,
      result: totalWin > 0 ? 'Win' : 'Loss',
      playedAt: new Date()
    });

    await user.save();

    res.json({
      ok: true,
      finalSymbols,
      winnings: totalWin,
      balance: user.chips,
      totalWagered: user.totalWagered,
      isLuckyDay: config.isLuckyDay,
      slotType,
      losingStreak: user.losingStreak,
      comebackSpinsLeft: user.comebackSpinsLeft
    });

  } catch (err) {
    console.error('Spin error', err);
    res.status(500).json({ error: 'Server error' });
  }
};
