// controllers/slotsController.js
const slotsConfig = require('../config/slotsConfig.js');
const GameHistory = require('../models/GameHistory');
const User = require('../models/User');

const slotType = 'ClassicSlot';
const config = slotsConfig[slotType];

// Helper: weighted random symbol
const getRandomSymbol = () => {
  const weighted = [];
  config.symbols.forEach(sym => {
    const weight = config.symbolChances?.[sym.name] || 1;
    for (let i = 0; i < weight; i++) weighted.push(sym);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
};

// Calculate winnings (same logic as client)
const calculateWinnings = (symbolsMatrix, bet) => {
  let totalWin = 0;
  const winningLines = [];

  config.paylines.forEach(line => {
    const first = symbolsMatrix[0][line[0]];
    const isWin = line.every((rowIdx, colIdx) => symbolsMatrix[colIdx][rowIdx].name === first.name);
    if (isWin) {
      totalWin += bet * first.multiplier;
      winningLines.push(line);
    }
  });

  return { totalWin, winningLines };
};

exports.spin = async (req, res) => {
  try {
    const userId = req.user.id;
    const bet = parseInt(req.body.bet, 10);

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient chips' });

    // Locking note: for high-concurrency you may want to use an atomic DB update or a transaction.

    // Determine final symbols server-side
    const finalSymbols = [];
    for (let c = 0; c < config.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < config.rows; r++) {
        const sym = getRandomSymbol();
        colSymbols.push({ name: sym.name, file: sym.file, multiplier: sym.multiplier });
      }
      finalSymbols.push(colSymbols);
    }

    // Evaluate winnings
    const { totalWin, winningLines } = calculateWinnings(finalSymbols, bet);

    // Update user's chips (deduct bet then add winnings)
    user.chips = (user.chips - bet) + totalWin;
    await user.save();

    // Save history
    await GameHistory.create({
      userId: user._id,
      bet,
      resultMatrix: finalSymbols.map(col => col.map(s => s.name)),
      winningLines,
      winnings: totalWin,
      gameType: slotType
    });

    // Response to client: finalSymbols (filenames), winnings, new balance, winningLines
    return res.json({
      ok: true,
      finalSymbols,
      winnings: totalWin,
      winningLines,
      balance: user.chips
    });
  } catch (err) {
    console.error('Spin error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
