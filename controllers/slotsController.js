// controllers/slotsController.js
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
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- DYNAMIC CONFIGURATION ---
const getDynamicConfig = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const baseConfig = slotsConfig[slotType];
  let payoutBoostFactor = 1.0;

  if (dayOfWeek === 0 || dayOfWeek === 1) payoutBoostFactor = 1.1; // Lucky Day

  // Include House Edge adjustment factor
  const houseAdjustment = 1 - (HOUSE_EDGE / 2);
  const dynamicSymbols = baseConfig.symbols.map(sym => ({
    ...sym,
    // Apply both the boost and the house edge adjustment
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

// 🌟 FINAL FIX: Payline validation and clean symbol matching
const calculateWinnings = (symbolsMatrix, bet, config) => {
  let totalWin = 0;
  // Initialize finalSymbols (output) with a copy of the matrix data, ready for win flagging
  const finalSymbols = symbolsMatrix.map(reel => reel.map(sym => ({ ...sym, win: false })));

  // 🛑 CRITICAL PAYLINE VALIDATION: Filter out any payline that uses an invalid row index.
  const validPaylines = config.paylines.filter(line => {
    // Check if every index is less than the number of available rows (e.g., 0-3 if rows=4)
    return line.every(rowIndex => rowIndex < config.rows);
  });

  validPaylines.forEach(line => {
    let winLength = 0, currentSymbolName = null;
    let winningSymbol = null; // Store the actual object from the first reel

    for (let r = 0; r < config.reels; r++) {
      const row = line[r];
      // Get the full symbol object from the raw matrix
      const symbol = symbolsMatrix[r][row];

      if (r === 0) {
        currentSymbolName = symbol.name; // Track name for comparison
        winningSymbol = symbol;          // Track object for multiplier
        winLength = 1;
      }
      // Compare the name of the current symbol against the starting symbol's name
      else if (symbol.name === currentSymbolName) {
        winLength++;
      } else {
        break; // Stop checking this line
      }
    }

    if (winLength >= 3) {
      const factor = PAYOUT_FACTORS[winLength] || 0;
      // Use the stored winningSymbol object for the correct multiplier
      const lineWin = bet * winningSymbol.multiplier * factor;
      totalWin += lineWin;

      // Mark symbols as winning in the finalSymbols array
      for (let r = 0; r < winLength; r++) {
        finalSymbols[r][line[r]].win = true;
      }
    }
  });

  return { totalWin, finalSymbols };
};
// --- END calculateWinnings ---

// ----------------- MAIN SPIN -----------------
exports.spin = async (req, res) => {
  let user; // Declare user outside try-catch for error refund logic
  const bet = parseInt(req.body.bet, 10); // Declare bet outside for error refund logic

  try {
    setSlotType(req);
    const config = getDynamicConfig();
    const userId = req.user.id;

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct bet
    user.chips -= bet;

    // --- Streak/Counter Setup ---
    user.losingStreak = user.losingStreak || 0;
    user.comebackSpinsLeft = user.comebackSpinsLeft || 0;
    user.spinsSinceLastSmallWin = user.spinsSinceLastSmallWin || 0;
    user.spinsSinceLastSmallWin++;
    user.totalWagered = (user.totalWagered || 0) + bet;


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

    // Initial calculation based on random symbols
    let { totalWin, finalSymbols } = calculateWinnings(symbolsMatrix, bet, config);

    // 🎯 --- WIN CONTROL LOGIC ---
    const MIN_RATE = config.baseWinRate.MIN; // Fetched per slot type
    const MAX_RATE = config.baseWinRate.MAX; // Fetched per slot type

    let winThreshold = MIN_RATE + Math.random() * (MAX_RATE - MIN_RATE);
    // Apply Low/High Balance Adjustments (Omitting for brevity, but use your logic)

    // 🔥 Comeback Mode (Boost)
    if (user.comebackSpinsLeft > 0) {
      winThreshold += (0.15 + Math.random() * 0.15);
      user.comebackSpinsLeft -= 1;
    }

    winThreshold = Math.min(Math.max(winThreshold, 0.05), 0.6);

    const winRoll = Math.random();
    let isForcedWin = false;

    // 🎁 --- FORCED SMALL WIN ---
    if (user.spinsSinceLastSmallWin === 5) {
      if (totalWin === 0) {
        const smallSymbols = config.symbols.filter(s => s.multiplier <= 1.5);
        if (smallSymbols.length > 0) {
          const winningSymbol = smallSymbols[Math.floor(Math.random() * smallSymbols.length)];
          const lineIndex = Math.floor(Math.random() * config.paylines.length);
          const line = config.paylines[lineIndex];

          // Ensure the line is valid before attempting to modify matrix
          if (line.every(rowIndex => rowIndex < config.rows)) {
            for (let r = 0; r < 3; r++) {
              symbolsMatrix[r][line[r]] = { // Mutate the matrix
                name: winningSymbol.name,
                file: winningSymbol.file,
                multiplier: winningSymbol.multiplier
              };
            }
            // Recalculate based on modified matrix
            const recalculated = calculateWinnings(symbolsMatrix, bet, config);
            totalWin = recalculated.totalWin;
            finalSymbols = recalculated.finalSymbols;
            isForcedWin = true;
          }
        }
      }
      user.spinsSinceLastSmallWin = 0; // Reset counter
    }

    // Standard Loss Check
    else if (totalWin > 0 && winRoll > winThreshold && !isForcedWin) {
      // If the random spin won, but the RNG control dictates a loss (rare/big win control)
      totalWin = 0;
      finalSymbols = symbolsMatrix.map(reel => reel.map(sym => ({ ...sym, win: false })));
    } else if (totalWin === 0 && winRoll < winThreshold && !isForcedWin) {
      // If the random spin lost, but the RNG control dictates a win (small win boost)
      // We skip forcing a win here, letting the 'Forced Small Win' cover this, or allowing a loss.
    }


    // --- RTP Adjustment (Final reduction on big wins) ---
    if (totalWin > 0 && !isForcedWin && Math.random() > TARGET_RTP) {
      const reduced = Math.floor(totalWin * (0.4 + Math.random() * 0.3));
      totalWin = reduced;
    }

    // --- Final Update and Response ---
    user.chips += totalWin;

    // Track streaks
    if (totalWin > 0) {
      user.losingStreak = 0;
    } else {
      user.losingStreak++;
      if (user.losingStreak >= 30 && user.comebackSpinsLeft === 0) {
        user.comebackSpinsLeft = 3 + Math.floor(Math.random() * 3);
        user.losingStreak = 0;
      }
    }

    user.gameHistory.push({
      gameType: slotType,
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
      isLuckyDay: config.isLuckyDay,
      losingStreak: user.losingStreak,
      comebackSpinsLeft: user.comebackSpinsLeft,
      spinsSinceLastSmallWin: user.spinsSinceLastSmallWin
    });

  } catch (err) {
    console.error('Spin error', err);
    // 🛡️ CRITICAL ERROR HANDLING: Refund the bet if the server crashes after deduction
    if (user && bet) {
      user.chips += bet;
      await user.save().catch(e => console.error("Refund failed:", e));
    }
    res.status(500).json({ error: 'Server error' });
  }
};