// controllers/minesController.js
const User = require('../models/User');

// --- Global in-memory game state ---
let gameState = {};
// -----------------------------------

// Helper function to calculate and process cash-out
async function processAutoCashout(userId, game) {
    if (game.revealed.length > 0 && !game.cashedOut) {
        
        // 1. Calculate Winnings
        const multiplier = 1 + 0.25 * game.revealed.length;
        const winnings = parseFloat((game.bet * multiplier).toFixed(2));

        // 2. Update user chips (Database operation: Payout)
        const user = await User.findById(userId);
        if (user) {
            // Note: The original bet was already deducted in the previous 'start' call.
            user.chips += winnings; 
            await user.save();
        }
        
        // 3. Mark as cashed out and delete from memory
        game.cashedOut = true;
        delete gameState[userId]; 
        
        return { 
            message: `Previous game automatically cashed out for ${winnings} chips.`,
            winnings,
            balance: user ? user.chips : null
        };
    } else {
        // Game found, but no tiles revealed (or already cashed out/lost).
        // If it's not cashed out, it means the bet was lost, but the user didn't hit a mine.
        // We still need to clear the old state to allow a new game.
        delete gameState[userId];
        return { message: "Previous game cleared (no safe tiles revealed)." };
    }
}

// Start a new mines game
exports.start = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bet, mineCount } = req.body;

    // Input validation (remains the same)
    if (!bet || bet < 1) return res.status(400).json({ ok: false, error: 'Invalid bet' });
    if (!mineCount || mineCount < 1 || mineCount > 24) return res.status(400).json({ ok: false, error: 'Invalid mine count' });

    let autoCashoutResult = null;
    
    // ⚠️ CRITICAL MODIFICATION: Handle existing game state (Auto-Cashout)
    if (gameState[userId]) {
        // If a state exists, resolve it first. This covers manual refresh and new game attempt.
        const oldGame = gameState[userId];
        
        // Only trigger auto-cashout if the game was NOT a loss (hitMine) and NOT manually cashed out
        if (!oldGame.cashedOut) {
            autoCashoutResult = await processAutoCashout(userId, oldGame);
        } else {
            // State exists but is marked cashedOut (shouldn't happen if properly deleted, but safe guard)
            delete gameState[userId];
        }
    }
    
    // Check if the state is still blocked (should only happen if an error occurred in processAutoCashout)
    if (gameState[userId]) {
        return res.status(400).json({ ok: false, error: 'Failed to resolve previous game state. Try again.' });
    }
    
    // --- CHIP DEDUCTION ---
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ ok: false, error: 'Insufficient chips' });

    // Deduct bet immediately (Database operation: Bet is now locked/forfeited upon loss of state)
    user.chips -= bet;
    await user.save();

    // Generate mines positions (remains the same)
    const mines = [];
    while (mines.length < mineCount) {
      const pos = Math.floor(Math.random() * 25);
      if (!mines.includes(pos)) mines.push(pos);
    }
    
    // Create new in-memory game state
    const gameId = Date.now().toString(); 
    
    gameState[userId] = {
      gameId, 
      userId,
      bet,
      mineCount,
      mines,
      revealed: [],
      cashedOut: false,
      balance: user.chips // Stored balance after deduction
    };

    // Return the auto-cashout message along with the new game start data
    res.json({ 
        ok: true, 
        gameId: gameId, 
        gridSize: 25, 
        balance: user.chips,
        autoCashout: autoCashoutResult // Send message about prior game resolution
    });
  } catch (err) {
    console.error('Start error', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};

// ----------------------------------------------------------------

// Reveal a tile (NO CHANGE - still deletes state on mine hit)
exports.reveal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId, index } = req.body; 

    const game = gameState[userId];
    
    if (!game) return res.status(404).json({ ok: false, error: 'Game not found or not active' });
    
    const tileIndex = parseInt(index);
    if (game.revealed.includes(tileIndex)) return res.status(400).json({ ok: false, error: 'Tile already revealed' });

    // If hit a mine
    if (game.mines.includes(tileIndex)) {
      game.cashedOut = true;
      delete gameState[userId]; 
      
      // Return the current chip balance (already reflects the loss from 'start')
      return res.json({ ok: false, hitMine: true, mines: game.mines, balance: game.balance });
    }

    // Safe tile (remains the same)
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

// Cash out (NO CHANGE - still processes manual cashout)
exports.cashout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { gameId } = req.body;

    const game = gameState[userId];
    
    if (!game) return res.status(404).json({ ok: false, error: 'Game not found or not active' });

    // Calculate winnings
    const multiplier = 1 + 0.25 * game.revealed.length;
    const winnings = parseFloat((game.bet * multiplier).toFixed(2));

    // Update user chips (Database operation: Payout)
    const user = await User.findById(userId);
    user.chips += winnings;
    await user.save();

    game.cashedOut = true;
    
    delete gameState[userId];

    res.json({ ok: true, winnings, balance: user.chips });
  } catch (err) {
    console.error('Cashout error', err);
    delete gameState[req.user.id];
    res.status(500).json({ ok: false, error: 'Server error' });
  }
};