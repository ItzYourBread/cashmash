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
// (for production: replace with user-session or Redis based game state)

// --- Start Game ---
exports.startGame = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bet = parseFloat(req.body.bet);
    // ... validation ...

    // Deduct bet from user
    user.chips -= bet;
    // NOTE: Save is delayed until the end to ensure all chip operations are grouped.

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
    const dealerScore = getCardValue(dealerHand[0]);
    let result = null;
    let balanceChange = 0; // For immediate chip refund/payout

    // Check for immediate Player Blackjack
    if (playerScore === 21 && playerHand.length === 2) {
      // Blackjack Payout (2.5x total return, so 1.5x win)
      const payout = bet * 2.5; 
      user.chips += payout;
      result = 'Blackjack! You win 💰';
      gameState[req.user._id].gameOver = true;
      gameState[req.user._id].result = result;
      // balanceChange for logging/immediate display if needed
    }

    await user.save(); // Save after bet deduction and potential blackjack payout

    res.json({
      playerHand,
      dealerHand: [dealerHand[0], { hidden: true }],
      playerScore,
      dealerScore,
      balance: user.chips,
      result // Send the immediate result (Blackjack) to the frontend
    });
  } catch (err) {
// ... error handling ...
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

    if (playerScore > 21) {
      state.result = 'Bust! Dealer Wins!';
      state.gameOver = true;
    }

    res.json({
      playerHand,
      playerScore,
      result: state.gameOver ? state.result : null
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
    // ... validation ...

    let { deck, playerHand, dealerHand, bet } = state;

    let dealerScore = calculateScore(dealerHand);
    const playerScore = calculateScore(playerHand);
    const playerHasBlackjack = (playerScore === 21 && playerHand.length === 2); // Should only be true if not caught in startGame

    // Dealer hits until 17+
    while (dealerScore < 17) {
      dealerHand.push(deck.pop());
      dealerScore = calculateScore(dealerHand);
    }

    // Recalculate player score after dealer play (in case of server-side re-check)
    const finalPlayerScore = calculateScore(playerHand);

    let payout = 0;
    let result = '';

    if (finalPlayerScore > 21) {
      result = 'You bust! Dealer wins ❌';
    } else if (dealerScore > 21) {
      result = 'Dealer busts! You win 💰';
      // Regular win payout
      payout = bet * 2; 
    } else if (finalPlayerScore > dealerScore) {
      result = 'You win 💰';
      // Regular win payout (should use 2x because we didn't check playerHasBlackjack here)
      payout = bet * 2; 
    } else if (finalPlayerScore < dealerScore) {
      result = 'Dealer wins ❌';
    } else { // Push
      result = 'Push 🤝';
      payout = bet; // Refund bet
    }
    
    // Apply payout
    if (payout > 0) {
      user.chips += payout;
    }
    
    // Save state
    state.gameOver = true;
    state.result = result;

    await user.save(); // Save changes to chips

    res.json({
      dealerHand,
      dealerScore,
      playerScore: finalPlayerScore,
      result,
      payout,
      balance: user.chips
    });
  } catch (err) {
// ... error handling ...
  }
};