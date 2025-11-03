const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User'); 

// Default slot type
let slotType = 'ClassicSlot';

/**
 * Optionally, allow slot type via query parameter
 * Example: /slots/spin?type=PharaohsRiches
 */
const setSlotType = (req) => {
  const type = req.query.type;
  if (type && slotsConfig[type]) {
    slotType = type;
  }
};

// --- RTP CONTROL CONFIG ---
const TARGET_RTP = 0.92; // 92% RTP means 8% house edge
const HOUSE_EDGE = 1 - TARGET_RTP;

// --- SERVER-SIDE PAYOUT FACTORS ---
const PAYOUT_FACTORS = {
  3: 1.0,
  4: 3.0,
  5: 5.0
};

// --- DYNAMIC CONFIGURATION HELPER ---
const getDynamicConfig = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  
  const baseConfig = slotsConfig[slotType];
  let payoutBoostFactor = 1.0; 
  
  if (dayOfWeek === 0 || dayOfWeek === 1) {
    payoutBoostFactor = 1.1; 
    console.log(`[SLOTS] Lucky Day Payout Boost of ${payoutBoostFactor}x activated for ${slotType}!`);
  } else {
    console.log(`[SLOTS] Standard Payouts for ${slotType}.`);
  }

  // Apply slight reduction for house edge
  const houseAdjustment = 1 - (HOUSE_EDGE / 2); 

  const dynamicSymbols = baseConfig.symbols.map(symbol => ({
    ...symbol,
    multiplier: symbol.multiplier * payoutBoostFactor * houseAdjustment
  }));
  
  return { 
    ...baseConfig, 
    symbols: dynamicSymbols, 
    isLuckyDay: payoutBoostFactor > 1.0 
  };
};
// --- END DYNAMIC CONFIGURATION HELPER ---

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
  const finalSymbols = symbolsMatrix.map(reel => reel.map(symbol => ({...symbol, win: false}))); 

  config.paylines.forEach(line => {
    let winLength = 0;
    let currentSymbol = null;

    for (let r = 0; r < config.reels; r++) { 
      const row = line[r]; 
      const symbol = finalSymbols[r][row]; 

      if (r === 0) {
        currentSymbol = symbol;
        winLength = 1;
      } else if (symbol.name === currentSymbol.name) {
        winLength++;
      } else {
        break; 
      }
    }

    if (winLength >= 3) {
      const payoutFactor = PAYOUT_FACTORS[winLength] || 0;
      const multiplier = currentSymbol.multiplier; 
      const lineWin = bet * multiplier * payoutFactor;
      totalWin += lineWin;

      for (let r = 0; r < winLength; r++) {
        const row = line[r];
        finalSymbols[r][row].win = true; 
      }
    }
  });

  return { totalWin, finalSymbols }; 
};

// ----------------- MAIN SPIN FUNCTION -----------------
exports.spin = async (req, res) => {
  try {
    setSlotType(req);
    const dynamicConfig = getDynamicConfig(); 
    const userId = req.user.id; 
    const bet = parseInt(req.body.bet, 10);

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    const user = await User.findById(userId); 
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient balance' });

    // Deduct bet
    user.chips -= bet;

    // Generate symbols matrix
    const symbolsMatrix = []; 
    for (let c = 0; c < dynamicConfig.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < dynamicConfig.rows; r++) {
        const sym = getRandomSymbol(dynamicConfig);
        colSymbols.push({ name: sym.name, file: sym.file, multiplier: sym.multiplier }); 
      }
      symbolsMatrix.push(colSymbols);
    }

    // Calculate winnings
    let { totalWin, finalSymbols } = calculateWinnings(symbolsMatrix, bet, dynamicConfig);

    // --- RTP BALANCING LOGIC ---
    const winChance = Math.random();
    if (totalWin > 0 && winChance > TARGET_RTP) {
      const oldWin = totalWin;
      totalWin = Math.floor(totalWin * (0.3 + Math.random() * 0.4)); 
      console.log(`[SLOTS] RTP Adjustment: Reduced win from ${oldWin} → ${totalWin}`);
    }

    // --- OPTIONAL NEAR-WIN VISUAL TEASE ---
    if (totalWin === 0 && Math.random() < 0.1) {
      const fakeIndex = Math.floor(Math.random() * finalSymbols.length);
      finalSymbols[fakeIndex][0].win = true; 
      console.log(`[SLOTS] Near-win simulation triggered`);
    }

    // ✅ --- UPDATE BALANCE AND RAKEBACK TRACKING ---
    user.chips += totalWin;
    user.totalWagered += bet; // <-- Log wager for rakeback tracking

    // Optional: store this spin in gameHistory (for record keeping)
    user.gameHistory.push({
      gameType: 'Slots',
      betAmount: bet,
      multiplier: totalWin > 0 ? totalWin / bet : 0,
      winAmount: totalWin,
      result: totalWin > 0 ? 'Win' : 'Loss',
      playedAt: new Date()
    });

    await user.save(); 

    // ✅ Respond
    return res.json({
      ok: true,
      finalSymbols, 
      winnings: totalWin,
      balance: user.chips,
      totalWagered: user.totalWagered, // optional for UI
      isLuckyDay: dynamicConfig.isLuckyDay,
      slotType
    });

  } catch (err) {
    console.error('Spin error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
