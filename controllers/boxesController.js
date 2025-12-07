// controllers/boxesController.js
const User = require('../models/User');

// --- Global In-Memory Game State ---
const boxesGames = {};

// Game Configuration
const GRID_ROWS = [2, 3, 4, 5, 6, 7, 8, 9]; 

// ========== SIMPLE VALIDATORS (ONLY bet & traps) ==========
function isValidNumber(n) {
    return typeof n === "number" && !isNaN(n) && isFinite(n);
}

function validBet(bet) {
    return isValidNumber(bet) && bet >= 1 && bet <= 100;
}

function validTrapCount(traps) {
    return Number.isInteger(traps) && traps >= 1 && traps <= 4;
}
// ===========================================================

/**
 * Helper: Calculate Multiplier for a specific row
 */
function calculateRowMultiplier(totalSpots, trapCount) {
    const actualTraps = Math.min(trapCount, totalSpots - 1);
    const safeSpots = totalSpots - actualTraps;

    const probability = safeSpots / totalSpots;

    const houseEdge = 0.03;
    const rawMultiplier = (1 / probability) * (1 - houseEdge);

    return Math.max(1, rawMultiplier);
}

// ===================== START =====================
exports.start = async (req, res) => {
    try {
        const userId = req.user.id;
        let { bet, trapCount } = req.body;

        bet = Number(bet);
        trapCount = Number(trapCount);

        // === Only bet & trapCount validation ===
        if (!validBet(bet))
            return res.status(400).json({ ok: false, error: "Invalid bet" });

        if (!validTrapCount(trapCount))
            return res.status(400).json({ ok: false, error: "Invalid traps" });
        // ========================================

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        if (user.balance < bet) return res.status(400).json({ ok: false, error: 'Insufficient balance' });

        // Deduct balance
        user.balance -= bet;
        user.totalWagered = (user.totalWagered || 0) + bet;
        await user.save();

        // Create row data
        const rowsData = [];

        GRID_ROWS.forEach((boxCount, rIndex) => {
            const actualTraps = Math.min(trapCount, boxCount - 1);

            const mines = [];
            while (mines.length < actualTraps) {
                const r = Math.floor(Math.random() * boxCount);
                if (!mines.includes(r)) mines.push(r);
            }

            rowsData.push({
                rowIndex: rIndex,
                boxCount: boxCount,
                mines: mines,
                multiplier: calculateRowMultiplier(boxCount, trapCount)
            });
        });

        // Initialize game state
        const gameId = Date.now().toString() + Math.random().toString(36).substr(2, 5);

        boxesGames[userId] = {
            gameId,
            userId,
            bet,
            trapCount,
            rowsData,
            currentRowIndex: GRID_ROWS.length - 1,
            currentMultiplier: 1.0,
            cashedOut: false,
            initialBalance: user.balance
        };

        res.json({
            ok: true,
            gameId,
            balance: user.balance,
            currentRowIndex: GRID_ROWS.length - 1
        });

    } catch (err) {
        console.error('Boxes Start Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};

// ===================== REVEAL =====================
exports.reveal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId, rowIndex, colIndex } = req.body;

        const game = boxesGames[userId];
        if (!game || game.gameId !== gameId || game.cashedOut) {
            return res.status(404).json({ ok: false, error: 'Game not active' });
        }

        // Validate row order
        if (rowIndex !== game.currentRowIndex) {
            return res.status(400).json({ ok: false, error: 'Invalid row selection' });
        }

        const rowData = game.rowsData[rowIndex];

        if (colIndex < 0 || colIndex >= rowData.boxCount) {
            return res.status(400).json({ ok: false, error: 'Invalid column' });
        }

        // Mine hit
        if (rowData.mines.includes(colIndex)) {
            game.cashedOut = true;
            delete boxesGames[userId];

            return res.json({
                ok: false,
                gameOver: true,
                allMines: rowData.mines,
                balance: game.initialBalance
            });
        }

        // Safe
        game.currentMultiplier *= rowData.multiplier;

        game.currentRowIndex--;

        // Top reached
        if (game.currentRowIndex < 0) {
            const winnings = parseFloat((game.bet * game.currentMultiplier).toFixed(2));

            const user = await User.findById(userId);
            user.balance += winnings;
            await user.save();

            game.cashedOut = true;
            delete boxesGames[userId];

            return res.json({
                ok: true,
                isWin: true,
                multiplier: game.currentMultiplier,
                winnings,
                balance: user.balance,
                rowMines: rowData.mines
            });
        }

        // Continue
        res.json({
            ok: true,
            isWin: false,
            multiplier: game.currentMultiplier,
            nextRowIndex: game.currentRowIndex,
            rowMines: rowData.mines
        });

    } catch (err) {
        console.error('Boxes Reveal Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};

// ===================== CASHOUT =====================
exports.cashout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId } = req.body;

        const game = boxesGames[userId];
        if (!game || game.gameId !== gameId || game.cashedOut) {
            return res.status(404).json({ ok: false, error: 'Game not active' });
        }

        // Must clear at least one row
        if (game.currentRowIndex === 7) {
            return res.status(400).json({ ok: false, error: 'Must clear one row to cashout' });
        }

        const winnings = parseFloat((game.bet * game.currentMultiplier).toFixed(2));

        const user = await User.findById(userId);
        user.balance += winnings;
        await user.save();

        game.cashedOut = true;
        delete boxesGames[userId];

        res.json({
            ok: true,
            winnings,
            balance: user.balance
        });

    } catch (err) {
        console.error('Boxes Cashout Error:', err);
        res.status(500).json({ ok: false, error: 'Server error' });
    }
};
