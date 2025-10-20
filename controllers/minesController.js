// controllers/minesController.js
const MinesGame = require('../models/MinesGame');
const User = require('../models/User');

// Start a new mines game
exports.start = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bet, mineCount } = req.body;

    if (!bet || bet < 1) return res.status(400).json({ ok: false, error: 'Invalid bet' });
    if (!mineCount || mineCount < 1 || mineCount > 24) return res.status(400).json({ ok: false, error: 'Invalid mine count' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ ok: false, error: 'Insufficient chips' });

    // Deduct bet immediately
    user.chips -= bet;
    await user.save();

    // Generate mines positions
    const mines = [];
    while (mines.length < mineCount) {
      const pos = Math.floor(Math.random() * 25);
      if (!mines.includes(pos)) mines.push(pos);
    }

    const newGame = await MinesGame.create({
      userId,
      bet,
      mineCount,
      mines,
      revealed: [],
      cashedOut: false
    });

    res.json({ ok: true, gameId: newGame._id, gridSize: 25 });
  } catch (err) {
    console.error('Start error', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

// Reveal a tile
exports.reveal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId, index } = req.body;

    const game = await MinesGame.findById(gameId);
    if (!game) return res.status(404).json({ ok: false, error: 'Game not found' });
    if (game.userId.toString() !== userId) return res.status(403).json({ ok: false, error: 'Forbidden' });
    if (game.cashedOut) return res.status(400).json({ ok: false, error: 'Game already ended' });

    if (game.revealed.includes(index)) return res.status(400).json({ ok: false, error: 'Tile already revealed' });

    // If hit a mine
    if (game.mines.includes(index)) {
      game.cashedOut = true;
      await game.save();
      return res.json({ ok: false, hitMine: true, mines: game.mines });
    }

    // Safe tile
    game.revealed.push(index);

    // Calculate multiplier: simple example, +0.25 per safe tile
    const multiplier = 1 + 0.25 * game.revealed.length;
    await game.save();

    res.json({ ok: true, multiplier });
  } catch (err) {
    console.error('Reveal error', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

// Cash out
exports.cashout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.body;

    const game = await MinesGame.findById(gameId);
    if (!game) return res.status(404).json({ ok: false, error: 'Game not found' });
    if (game.userId.toString() !== userId) return res.status(403).json({ ok: false, error: 'Forbidden' });
    if (game.cashedOut) return res.status(400).json({ ok: false, error: 'Game already ended' });

    const winnings = parseFloat((game.bet * (1 + 0.25 * game.revealed.length)).toFixed(2));

    const user = await User.findById(userId);
    user.chips += winnings;
    await user.save();

    game.cashedOut = true;
    await game.save();

    res.json({ ok: true, winnings, balance: user.chips });
  } catch (err) {
    console.error('Cashout error', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};
