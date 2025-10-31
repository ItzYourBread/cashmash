// controllers/slotsController.js
const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User'); 

const slotType = 'ClassicSlot';

// Server-side Payout Logic
const PAYOUT_FACTORS = {
    3: 1.0,
    4: 3.0,
    5: 5.0
};

// --- DYNAMIC CONFIGURATION HELPER ---
const getDynamicConfig = () => {
    const today = new Date();
    // 0 = Sunday, 1 = Monday
    const dayOfWeek = today.getDay(); 
    
    // Base configuration from slotsConfig.js (which includes RTP adjustments)
    const baseConfig = slotsConfig[slotType];
    
    let payoutBoostFactor = 1.0; 
    
    // Apply 10% boost on Sunday (0) and Monday (1)
    if (dayOfWeek === 0 || dayOfWeek === 1) {
        payoutBoostFactor = 1.1; // 10% increase in all payouts for lucky days
        console.log(`[SLOTS] Lucky Day Payout Boost of ${payoutBoostFactor}x activated!`);
    } else {
        console.log('[SLOTS] Standard Payouts in effect.');
    }

    // Apply the boost to the symbol multipliers
    const dynamicSymbols = baseConfig.symbols.map(symbol => ({
        ...symbol,
        multiplier: symbol.multiplier * payoutBoostFactor 
    }));
    
    // Return the dynamically modified config object
    return { 
        ...baseConfig, 
        symbols: dynamicSymbols, 
        isLuckyDay: payoutBoostFactor > 1.0 
    };
};
// --- END DYNAMIC CONFIGURATION HELPER ---


// Helper: weighted random symbol (uses dynamic config)
const getRandomSymbol = (config) => {
  const weighted = [];
  config.symbols.forEach(sym => {
    // Note: Chance is NOT boosted, only multiplier is.
    const weight = config.symbolChances?.[sym.name] || 1; 
    for (let i = 0; i < weight; i++) weighted.push(sym);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
};

/**
 * Checks paylines, calculates total winnings, and marks winning symbols in the grid.
 * @param {Array<Array<Object>>} symbolsMatrix - The 5x4 grid of symbols (unmarked).
 * @param {number} bet - The total bet amount.
 * @param {Object} config - The dynamic slot configuration.
 */
const calculateWinnings = (symbolsMatrix, bet, config) => { 
    let totalWin = 0;
    const finalSymbols = symbolsMatrix.map(reel => reel.map(symbol => ({...symbol, win: false}))); 

    config.paylines.forEach(line => {
        let winLength = 0;
        let currentSymbol = null;
        
        // 1. Check for win length
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

        // 2. Calculate payout and mark symbols
        if (winLength >= 3) {
            const payoutFactor = PAYOUT_FACTORS[winLength] || 0;
            // This multiplier is ALREADY boosted if it's a lucky day
            const multiplier = currentSymbol.multiplier; 
            
            // Calculate the total line win: Bet * Symbol Multiplier (boosted) * Win Length Factor
            const lineWin = bet * multiplier * payoutFactor;
            totalWin += lineWin;

            // Mark the winning symbols
            for (let r = 0; r < winLength; r++) {
                const row = line[r];
                finalSymbols[r][row].win = true; 
            }
        }
    });

    return { totalWin, finalSymbols }; 
};

exports.spin = async (req, res) => {
  try {
    // Get dynamic config first
    const dynamicConfig = getDynamicConfig(); 
    
    const userId = req.user.id; 
    const bet = parseInt(req.body.bet, 10);

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    // Assuming User model and authentication are correct
    const user = await User.findById(userId); 
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient chips' });

    // Deduct bet immediately
    user.chips -= bet; 

    // Determine final symbols using the dynamic config
    const symbolsMatrix = []; 
    for (let c = 0; c < dynamicConfig.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < dynamicConfig.rows; r++) {
        // Use the dynamic config for symbol selection
        const sym = getRandomSymbol(dynamicConfig);
        
        // Store the final calculated multiplier for the win calculation
        colSymbols.push({ name: sym.name, file: sym.file, multiplier: sym.multiplier }); 
      }
      symbolsMatrix.push(colSymbols);
    }

    // Evaluate winnings using the dynamic config
    const { totalWin, finalSymbols } = calculateWinnings(symbolsMatrix, bet, dynamicConfig);

    // Add winnings back to the balance
    user.chips += totalWin;
    await user.save(); 

    // Response to client
    return res.json({
      ok: true,
      finalSymbols, 
      winnings: totalWin,
      balance: user.chips,
      isLuckyDay: dynamicConfig.isLuckyDay // Indicate to the client if the boost was active
    });
  } catch (err) {
    console.error('Spin error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};