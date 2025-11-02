// controllers/baccaratController.js
const User = require('../models/User'); 

// --- Card and Point Logic ---
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["ace","2","3","4","5","6","7","8","9","10","jack","queen","king"];
const cardValues = {
  "ace":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,
  "10":0,"jack":0,"queen":0,"king":0
};

// Calculate Baccarat points (mod 10)
function calculatePoints(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0) % 10;
}

// Helper: create a single card with a specific point value
function createCardWithPoint(pointValue) {
  const rank = Object.keys(cardValues).find(k => cardValues[k] === pointValue);
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { rank, suit, file: `${rank}_of_${suit}.svg`, value: pointValue };
}

// Helper: Generate a hand that results in a specific point total (2-card simplicity)
function generateHandPoints(points) {
    let hand = [];
    
    // Use two cards to achieve the target point (mod 10)
    // Card 1: Random value (1 to 9, or 0)
    let card1Value = Math.floor(Math.random() * 10);
    
    // Card 2: Calculate the required value for the total to equal 'points' (mod 10)
    // (card1Value + card2Value) % 10 = points
    // card2Value = (points - card1Value + 10) % 10 
    let card2Value = (points - card1Value + 10) % 10;
    
    hand.push(createCardWithPoint(card1Value));
    hand.push(createCardWithPoint(card2Value));
    
    // To add more randomness, sometimes add a 3rd card that is 0-value (K, Q, J, 10)
    if (Math.random() < 0.3) {
        hand.push(createCardWithPoint(0));
    }
    
    // If the hand has > 2 cards, we recalculate points to ensure the outcome is correct
    // In a production environment, you would enforce the Third Card Rule draw logic 
    // for visual authenticity, but for simple 'RTP bias', this is acceptable.
    
    return hand;
}

// --- NEW Biased Winner Determination Logic (Enforcing 70% User Loss) ---
function determineBiasedWinner(pBet, bBet, tBet) {
    const betsPlaced = [];
    if (pBet > 0) betsPlaced.push("player");
    if (bBet > 0) betsPlaced.push("banker");
    if (tBet > 0) betsPlaced.push("tie");

    const loseOptions = ["player", "banker", "tie"].filter(opt => !betsPlaced.includes(opt));
    const rng = Math.random();

    // Banker: ~45.8% (best house odds)
    const BANKER_WIN_PROB = 0.458; 
    // Player: ~44.6% 
    const PLAYER_WIN_PROB = 0.446; 
    // Tie: ~9.6% 

    // Case 1: User bet on ALL THREE options (Loss is impossible, so use RTP)
    if (betsPlaced.length === 3) {
        // Fallback to standard Baccarat probabilities when a loss is impossible
        if (rng < BANKER_WIN_PROB) return 'banker'; 
        if (rng < (BANKER_WIN_PROB + PLAYER_WIN_PROB)) return 'player';
        return 'tie';

    // Case 2: User bet on ONE or TWO options (Loss is possible)
    } else {
        // 70% chance to lose ALL placed bets (winner is an option the user did NOT bet on)
        if (rng < 0.70) {
            // Pick a winner from the options the user did NOT bet on
            return loseOptions[Math.floor(Math.random() * loseOptions.length)];
        } 
        // 30% chance to win ONE of the placed bets
        else {
            // Pick a winner from the options the user DID bet on
            return betsPlaced[Math.floor(Math.random() * betsPlaced.length)];
        }
    }
}

// --- NEW Biased Hand Generation (Ensures Outcome Matches Winner) ---
function generateWinningHand(winner) {
    let playerPoints, bankerPoints;

    if (winner === 'player') {
        // Player wins: Player score > Banker score
        playerPoints = Math.floor(Math.random() * 3) + 7; // Target 7, 8, or 9
        bankerPoints = Math.floor(Math.random() * 7);    // Target 0 to 6
        // Re-adjust if the random scores somehow caused a tie or loss
        if (playerPoints <= bankerPoints) playerPoints = (bankerPoints + 1) % 10; 

    } else if (winner === 'banker') {
        // Banker wins: Banker score > Player score
        bankerPoints = Math.floor(Math.random() * 3) + 7; // Target 7, 8, or 9
        playerPoints = Math.floor(Math.random() * 7);    // Target 0 to 6
        // Re-adjust if the random scores somehow caused a tie or loss
        if (bankerPoints <= playerPoints) bankerPoints = (playerPoints + 1) % 10; 

    } else { // winner === 'tie'
        // Tie: Match points
        const tiePoint = Math.floor(Math.random() * 10); // Target 0 to 9
        playerPoints = tiePoint;
        bankerPoints = tiePoint;
    }

    const playerHand = generateHandPoints(playerPoints);
    const bankerHand = generateHandPoints(bankerPoints);

    // Final point calculation (handles potential 3rd card 0-value)
    const finalPlayerPoints = calculatePoints(playerHand);
    const finalBankerPoints = calculatePoints(bankerHand);

    return { 
        winner, 
        player: { cards: playerHand, points: finalPlayerPoints }, 
        banker: { cards: bankerHand, points: finalBankerPoints }
    };
}


// --- Main Controller for Multi-Bet Baccarat ---
exports.playBaccarat = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { betPlayer = 0, betBanker = 0, betTie = 0 } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:"User not found" });

    // Validate and parse bets
    const pBet = parseFloat(betPlayer) || 0;
    const bBet = parseFloat(betBanker) || 0;
    const tBet = parseFloat(betTie) || 0;
    
    const totalBet = pBet + bBet + tBet;

    if (totalBet <= 0) return res.status(400).json({ success:false, message:"No valid bets placed." });
    if (totalBet > user.chips) return res.status(400).json({ success:false, message:"Insufficient chips." });

    // Deduct total bet upfront (LOCK FUNDS)
    user.chips -= totalBet;

    // 1. Determine the winner based on RTP model (no bet-size influence)
    const winner = determineBiasedWinner(pBet, bBet, tBet);
    
    // 2. Generate a card hand that matches the determined winner
    const gameResult = generateWinningHand(winner);

    // 3. Check for Lucky Day Payout Constraint
    const now = new Date();
    // Sunday (0) and Monday (1) are the "Lucky Days"
    const isLuckyDay = (now.getDay() === 0 || now.getDay() === 1);
    
    // 4. Calculate payouts
    let winnings = 0; 
    let profit = 0;   

    if (winner === "tie") {
        // Tie Bet: Pays 8:1
        if (tBet > 0) {
            const tieProfit = isLuckyDay ? tBet * 8 : 0;
            winnings += tBet + tieProfit; // Return original bet + profit (if lucky day)
            profit += tieProfit;
        }
        // Player and Banker Bets: PUSH (original bet returned)
        winnings += pBet;
        winnings += bBet;

    } else if (winner === "player") {
        // Player Bet: Pays 1:1
        if (pBet > 0) {
            const playerProfit = isLuckyDay ? pBet * 1 : 0;
            winnings += pBet + playerProfit; 
            profit += playerProfit;
        }
        
    } else if (winner === "banker") {
        // Banker Bet: Pays 0.95:1
        if (bBet > 0) {
            const bankerProfit = isLuckyDay ? bBet * 0.95 : 0;
            winnings += bBet + bankerProfit; 
            profit += bankerProfit;
        }
    }

    // Final chip update
    user.chips += winnings;
    
    await user.save(); 

    return res.json({
      success: true,
      result: winner,
      player: gameResult.player,
      banker: gameResult.banker,
      profit: profit,
      isLuckyDay: isLuckyDay,
      balance: user.chips
    });

  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success:false, message:"Internal server error" });
  }
};