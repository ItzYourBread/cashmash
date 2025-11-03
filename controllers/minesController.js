// controllers/minesController.js
const User = require('../models/User');

// --- Global in-memory game state ---
let gameState = {};
// -----------------------------------

// Helper: process auto cashout (unchanged, just add rakeback tracking)
async function processAutoCashout(userId, game) {
    if (game.revealed.length > 0 && !game.cashedOut) {
        // 1. Calculate Winnings
        const multiplier = 1 + 0.25 * game.revealed.length;
        const winnings = parseFloat((game.bet * multiplier).toFixed(2));

        // 2. Update user chips and rakeback stats
        const user = await User.findById(userId);
        if (user) {
            // Add winnings (payout)
            user.chips += winnings;

            // ✅ Rakeback tracking: increment total wagered by bet amount
            user.totalWagered = (user.totalWagered || 0) + game.bet;

            await user.save();
        }

        // 3. Mark game as cashed out and clear state
        game.cashedOut = true;
        delete gameState[userId];

        return {
            message: `Previous game automatically cashed out for ${winnings} chips.`,
            winnings,
            balance: user ? user.chips : null
        };
    } else {
        delete gameState[userId];
        return { message: "Previous game cleared (no safe tiles revealed)." };
    }
}

// ----------------------------------------------------------------
// Start new Mines game
exports.start = async (req, res) => {
    try {
        const userId = req.user.id;
        const { bet, mineCount } = req.body;

        if (!bet || bet < 1) return res.status(400).json({ ok: false, error: 'Invalid bet' });
        if (!mineCount || mineCount < 1 || mineCount > 24) return res.status(400).json({ ok: false, error: 'Invalid mine count' });

        let autoCashoutResult = null;

        // Handle previous unfinished game
        if (gameState[userId]) {
            const oldGame = gameState[userId];
            if (!oldGame.cashedOut) {
                autoCashoutResult = await processAutoCashout(userId, oldGame);
            } else {
                delete gameState[userId];
            }
        }

        if (gameState[userId]) {
            return res.status(400).json({ ok: false, error: 'Failed to resolve previous game state. Try again.' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        if (bet > user.chips) return res.status(400).json({ ok: false, error: 'Insufficient chips' });

        // --- CHIP DEDUCTION ---
        user.chips -= bet;

        // ✅ Track rakeback wagering
        user.totalWagered = (user.totalWagered || 0) + bet;

        await user.save();

        // --- Generate mines ---
        const mines = [];
        while (mines.length < mineCount) {
            const pos = Math.floor(Math.random() * 25);
            if (!mines.includes(pos)) mines.push(pos);
        }

        const gameId = Date.now().toString();
        gameState[userId] = {
            gameId,
            userId,
            bet,
            mineCount,
            mines,
            revealed: [],
            cashedOut: false,
            balance: user.chips
        };

        res.json({
            ok: true,
            gameId,
            gridSize: 25,
            balance: user.chips,
            autoCashout: autoCashoutResult
        });
    } catch (err) {
        console.error('Start error', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};

// ----------------------------------------------------------------
// Reveal a tile
exports.reveal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId, index } = req.body;

        const game = gameState[userId];
        if (!game) return res.status(404).json({ ok: false, error: 'Game not found or not active' });

        const tileIndex = parseInt(index);
        if (game.revealed.includes(tileIndex)) return res.status(400).json({ ok: false, error: 'Tile already revealed' });

        // --- Hit a mine (Lose)
        if (game.mines.includes(tileIndex)) {
            game.cashedOut = true;
            delete gameState[userId];

            return res.json({
                ok: false,
                hitMine: true,
                mines: game.mines,
                balance: game.balance
            });
        }

        // --- Safe tile ---
        game.revealed.push(tileIndex);
        const multiplier = parseFloat((1 + 0.25 * game.revealed.length).toFixed(2));

        res.json({ ok: true, multiplier });
    } catch (err) {
        console.error('Reveal error', err);
        delete gameState[req.user.id];
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};

// ----------------------------------------------------------------
// Manual cashout
exports.cashout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId } = req.body;

        const game = gameState[userId];
        if (!game) return res.status(404).json({ ok: false, error: 'Game not found or not active' });

        const multiplier = 1 + 0.25 * game.revealed.length;
        const winnings = parseFloat((game.bet * multiplier).toFixed(2));

        const user = await User.findById(userId);
        if (user) {
            user.chips += winnings;

            // ✅ Rakeback tracking (wager)
            user.totalWagered = (user.totalWagered || 0) + game.bet;

            await user.save();
        }

        game.cashedOut = true;
        delete gameState[userId];

        res.json({ ok: true, winnings, balance: user.chips });
    } catch (err) {
        console.error('Cashout error', err);
        delete gameState[req.user.id];
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};
