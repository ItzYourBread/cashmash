const User = require('../models/User');

// --- Utility Functions ---
function getCardValue(card) {
  const rank = card.rank;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function calculateScore(hand) {
  let score = 0;
  let aces = 0;

  hand.forEach(card => {
    score += getCardValue(card);
    if (card.rank === 'A') aces++;
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function createDeck() {
  const suits = ['hearts', 'spades', 'clubs', 'diamonds'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck = [];
  suits.forEach(s => ranks.forEach(r => deck.push({ rank: r, suit: s })));
  return deck.sort(() => Math.random() - 0.5);
}

// --- Global game state per session (simple in-memory) ---
let gameState = {}; 

// --- Start Game ---
exports.startGame = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bet = parseFloat(req.body.bet);
    
    // Validation
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isNaN(bet) || bet <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
    if (bet > user.chips) return res.status(400).json({ message: 'Insufficient chips' });

    // Deduct bet from user
    user.chips -= bet;

    // Create new deck and deal cards
    const deck = createDeck();
    const playerHand = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    gameState[req.user._id] = {
      deck,
      playerHand,
      dealerHand,
      bet,
      gameOver: false,
      result: ''
    };

    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand); // Calculate full dealer score for checks
    let result = null;

    // Check for immediate Blackjack
    if (playerScore === 21 && playerHand.length === 2) {
        let dealerHiddenCardRevealed = false;
        
        if (dealerScore === 21) {
            // Push (Player and Dealer Blackjack)
            user.chips += bet; // Refund bet
            result = 'Push: Both Blackjack 🤝';
            gameState[req.user._id].gameOver = true;
            dealerHiddenCardRevealed = true;
        } else {
            // Player Blackjack Win (1.5x profit, 2.5x total return)
            const payout = bet * 2.5; 
            user.chips += payout;
            result = 'Blackjack! You win 💰';
            gameState[req.user._id].gameOver = true;
            dealerHiddenCardRevealed = true; // Dealer reveals card
        }
        gameState[req.user._id].result = result;
        
        // If game ended, return full dealer hand
        if (gameState[req.user._id].gameOver) {
            await user.save();
            delete gameState[req.user._id]; // Clear state immediately
            return res.json({
                playerHand,
                dealerHand, // Full hand revealed
                playerScore,
                dealerScore,
                balance: user.chips,
                result
            });
        }
    }

    await user.save(); // Save after bet deduction

    res.json({
      playerHand,
      // Return the second dealer card marked as hidden for the frontend
      dealerHand: [dealerHand[0], { rank: dealerHand[1].rank, suit: dealerHand[1].suit, hidden: true }],
      playerScore,
      dealerScore: getCardValue(dealerHand[0]), // Only show the value of the visible card
      balance: user.chips,
      result // Send the immediate result (Blackjack) to the frontend
    });
  } catch (err) {
    console.error('Start error:', err);
    res.status(500).json({ message: 'Error starting game' });
  }
};

// --- Player Hits ---
exports.hit = async (req, res) => {
  try {
    const state = gameState[req.user._id];
    if (!state || state.gameOver)
      return res.status(400).json({ message: 'Game not active' });

    const { deck, playerHand } = state;
    playerHand.push(deck.pop());
    const playerScore = calculateScore(playerHand);
    
    let result = null;
    let newBalance = null;

    if (playerScore > 21) {
      state.result = 'Bust! Dealer Wins ❌';
      state.gameOver = true;
      result = state.result;
      
      // Since game is over (Bust), save and clear state
      const user = await User.findById(req.user._id);
      newBalance = user.chips; // Chip deduction already happened in startGame (no refund)
      await user.save();
      delete gameState[req.user._id];
    }

    res.json({
      playerHand,
      playerScore,
      result,
      balance: newBalance
    });
  } catch (err) {
    res.status(500).json({ message: 'Error hitting card' });
  }
};

// --- Player Stands ---
exports.stand = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const state = gameState[req.user._id];

    if (!state || state.gameOver)
        return res.status(400).json({ message: 'Game not active or already finished' });
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    let { deck, playerHand, dealerHand, bet } = state;

    let dealerScore = calculateScore(dealerHand);
    const finalPlayerScore = calculateScore(playerHand);

    // Dealer hits until 17+
    while (dealerScore < 17) {
      dealerHand.push(deck.pop());
      dealerScore = calculateScore(dealerHand);
    }
    
    let amountToReturn = 0;
    let result = '';

    if (finalPlayerScore > 21) {
      // This should have been caught in hit() but is a safety check
      result = 'You bust! Dealer wins ❌';
    } else if (dealerScore > 21) {
      result = 'Dealer busts! You win 💰';
      amountToReturn = bet * 2; // Win: Return original bet (1x) + Profit (1x)
    } else if (finalPlayerScore > dealerScore) {
      result = 'You win 💰';
      amountToReturn = bet * 2; // Win: Return original bet (1x) + Profit (1x)
    } else if (finalPlayerScore < dealerScore) {
      result = 'Dealer wins ❌';
      amountToReturn = 0; // Loss: Original bet is already deducted
    } else { // Push
      result = 'Push 🤝';
      amountToReturn = bet * 1; // Push: Refund original bet
    }
    
    // Apply payout/refund (amountToReturn includes the original bet)
    user.chips += amountToReturn;
    
    // Save state and clear
    state.gameOver = true;
    state.result = result;
    await user.save(); 
    delete gameState[req.user._id]; // Clear state after round end

    res.json({
      dealerHand, // Full, final dealer hand
      dealerScore,
      playerScore: finalPlayerScore,
      result,
      payout: amountToReturn,
      balance: user.chips
    });
  } catch (err) {
    console.error('Stand error:', err);
    res.status(500).json({ message: 'Error during stand/dealer play' });
  }
};