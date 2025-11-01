const User = require('../models/User');

// Function to check if today is Sunday (0) or Monday (1)
function isLuckyDay() {
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    // 0 = Sunday, 1 = Monday
    return dayOfWeek === 0 || dayOfWeek === 1;
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
    user.chips -= bet; // MUST deduct before dealing

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
    const dealerScore = calculateScore(dealerHand); 
    let result = null;

    // Check for immediate Blackjack
    if (playerScore === 21 && playerHand.length === 2) {
        let payout = 0;
        let winnings = 0;
        
        if (dealerScore === 21) {
            // Push (Player and Dealer Blackjack)
            payout = bet * 1; // Refund bet
            winnings = 0;
            result = `Push: Both Blackjack 🤝 (+৳${winnings.toFixed(2)})`;
        } else {
            // Player Blackjack Win (Payout adjusted by day)
            if (isLuckyDay()) {
                // LUCKY DAYS: 3:2 payout
                payout = bet * 2.5; 
                winnings = bet * 1.5;
                result = `Blackjack! You win 💰 (3:2 Payout) +৳${winnings.toFixed(2)}`;
            } else {
                // PROFIT DAYS: 6:5 payout
                payout = bet * 2.2; 
                winnings = bet * 1.2;
                result = `Blackjack! You win 💰 (6:5 Payout) +৳${winnings.toFixed(2)}`;
            }
        }
        
        user.chips += payout; // Add total return to user chips
        
        gameState[req.user._id].gameOver = true;
        gameState[req.user._id].result = result;
        
        // If game ended, return full dealer hand
        if (gameState[req.user._id].gameOver) {
            await user.save();
            delete gameState[req.user._id]; 
            return res.json({
                playerHand,
                dealerHand, 
                playerScore,
                dealerScore,
                balance: user.chips,
                result // TEXT includes winnings
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

    const { deck, playerHand, bet } = state; // Include bet for loss calculation
    playerHand.push(deck.pop());
    const playerScore = calculateScore(playerHand);
    
    let result = null;
    let newBalance = null;

    if (playerScore > 21) {
      // BUST: Player loses the bet amount.
      const lossAmount = bet; 
      state.result = `Bust! Dealer Wins ❌ -$${lossAmount.toFixed(2)}`;
      state.gameOver = true;
      result = state.result;
      
      const user = await User.findById(req.user._id);
      newBalance = user.chips; // Chip deduction already happened in startGame (no refund)
      await user.save();
      delete gameState[req.user._id];
    }

    res.json({
      playerHand,
      playerScore,
      result, // TEXT includes loss
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

    // Function check is redefined here to ensure scope, or placed outside of all handlers
    const isLuckyDay = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        return dayOfWeek === 0 || dayOfWeek === 1;
    };
    
    // --- DEALER HIT LOGIC ADJUSTED FOR RTP (~99.5% vs ~99.3%) ---
    const luckyDay = isLuckyDay();

    while (dealerScore < 17 || 
           (!luckyDay && dealerScore === 17 && dealerHand.some(c => c.rank === 'A' && getCardValue(c) === 11) && calculateScore(dealerHand) === 17) ) 
    {
        dealerHand.push(deck.pop());
        dealerScore = calculateScore(dealerHand);
    }
    // --- END DEALER HIT LOGIC ADJUSTED FOR RTP ---
    
    let amountToReturn = 0; // Total chips added back (Profit + Bet Refund)
    let winnings = 0;       // Pure profit made this hand
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
    } else { // Push
      result = 'Push';
      amountToReturn = bet * 1; 
      winnings = 0;
    }
    
    // Format the result text based on win/loss/push
    if (winnings > 0) {
        result += ` +৳${winnings.toFixed(2)}`;
    } else if (winnings < 0) {
        // Use Math.abs to show the loss amount without the extra '-'
        result += ` -৳${Math.abs(winnings).toFixed(2)}`; 
    } else if (winnings === 0 && amountToReturn > 0) {
        result += ` (+৳0.00)`; // explicitly show 0 win on a push
    }
    
    // Apply payout/refund 
    user.chips += amountToReturn;
    
    // Save state and clear
    state.gameOver = true;
    state.result = result; // Final text result
    await user.save(); 
    delete gameState[req.user._id]; 

    res.json({
      dealerHand, 
      dealerScore,
      playerScore: finalPlayerScore,
      result, // TEXT includes winnings/losses
      payout: amountToReturn, 
      winnings: winnings,     
      balance: user.chips
    });
  } catch (err) {
    console.error('Stand error:', err);
    res.status(500).json({ message: 'Error during stand/dealer play' });
  }
};