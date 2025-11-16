const User = require('../models/User');

// Function to check if today is Sunday (0) or Monday (1)
function isLuckyDay() {
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    return dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday
}

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

// --- Global game state per session ---
let gameState = {}; 

// --- Start Game ---
exports.startGame = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bet = parseFloat(req.body.bet);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isNaN(bet) || bet <= 0) return res.status(400).json({ message: 'Invalid bet amount' });
    if (bet > user.balance) return res.status(400).json({ message: 'Insufficient Balance' });

    // Deduct bet and track rakeback
    user.balance -= bet;
    user.totalWagered = (user.totalWagered || 0) + bet; // ✅ Track wager for rakeback

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
    const dealerScore = calculateScore(dealerHand); 
    let result = null;

    // Immediate Blackjack check
    if (playerScore === 21 && playerHand.length === 2) {
        let payout = 0;
        let winnings = 0;
        
        if (dealerScore === 21) {
            payout = bet;
            winnings = 0;
            result = `Push: Both Blackjack (+$${winnings.toFixed(2)})`;
        } else {
            if (isLuckyDay()) {
                payout = bet * 2.5; 
                winnings = bet * 1.5;
                result = `Blackjack! You win (3:2 Payout) +$${winnings.toFixed(2)}`;
            } else {
                payout = bet * 2.2; 
                winnings = bet * 1.2;
                result = `Blackjack! You win (6:5 Payout) +$${winnings.toFixed(2)}`;
            }
        }
        
        user.balance += payout;
        gameState[req.user._id].gameOver = true;
        gameState[req.user._id].result = result;
        
        await user.save();
        delete gameState[req.user._id]; 

        return res.json({
            playerHand,
            dealerHand,
            playerScore,
            dealerScore,
            balance: user.balance,
            result
        });
    }

    await user.save(); 

    res.json({
      playerHand,
      dealerHand: [dealerHand[0], { rank: dealerHand[1].rank, suit: dealerHand[1].suit, hidden: true }],
      playerScore,
      dealerScore: getCardValue(dealerHand[0]),
      balance: user.balance,
      result
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
    if (!state || state.gameOver) return res.status(400).json({ message: 'Game not active' });

    const { deck, playerHand, bet } = state;
    playerHand.push(deck.pop());
    const playerScore = calculateScore(playerHand);

    let result = null;
    let newBalance = null;

    if (playerScore > 21) {
      state.gameOver = true;
      state.result = `Bust! Dealer Wins -$${bet.toFixed(2)}`;
      result = state.result;

      const user = await User.findById(req.user._id);
      newBalance = user.balance; // Chip deduction already applied
      await user.save();
      delete gameState[req.user._id];
    }

    res.json({ playerHand, playerScore, result, balance: newBalance });
  } catch (err) {
    res.status(500).json({ message: 'Error hitting card' });
  }
};

// --- Player Stands ---
exports.stand = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const state = gameState[req.user._id];
    if (!state || state.gameOver) return res.status(400).json({ message: 'Game not active or finished' });
    if (!user) return res.status(404).json({ message: 'User not found' });

    let { deck, playerHand, dealerHand, bet } = state;
    let dealerScore = calculateScore(dealerHand);
    const finalPlayerScore = calculateScore(playerHand);

    while (dealerScore < 17) {
        dealerHand.push(deck.pop());
        dealerScore = calculateScore(dealerHand);
    }

    let amountToReturn = 0;
    let winnings = 0;
    let result = '';

    if (finalPlayerScore > 21) {
      result = 'You bust! Dealer wins';
      amountToReturn = 0;
      winnings = -bet;
    } else if (dealerScore > 21) {
      result = 'Dealer busts! You win';
      amountToReturn = bet * 2;
      winnings = bet;
    } else if (finalPlayerScore > dealerScore) {
      result = 'You win';
      amountToReturn = bet * 2;
      winnings = bet;
    } else if (finalPlayerScore < dealerScore) {
      result = 'Dealer wins';
      amountToReturn = 0;
      winnings = -bet;
    } else {
      result = 'Push';
      amountToReturn = bet;
      winnings = 0;
    }

    if (winnings > 0) result += ` +$${winnings.toFixed(2)}`;
    else if (winnings < 0) result += ` -$${Math.abs(winnings).toFixed(2)}`;
    else if (winnings === 0 && amountToReturn > 0) result += ` (+$0.00)`;

    user.balance += amountToReturn;

    // ✅ Rakeback tracking: all bets count
    user.totalWagered = (user.totalWagered || 0) + bet;

    await user.save();
    state.gameOver = true;
    state.result = result;
    delete gameState[req.user._id];

    res.json({
      dealerHand,
      dealerScore,
      playerScore: finalPlayerScore,
      result,
      payout: amountToReturn,
      winnings,
      balance: user.balance
    });
  } catch (err) {
    console.error('Stand error:', err);
    res.status(500).json({ message: 'Error during stand/dealer play' });
  }
};
