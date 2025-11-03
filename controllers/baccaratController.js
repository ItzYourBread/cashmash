// controllers/baccaratController.js
const User = require('../models/User'); 

// --- Card and Point Logic (unchanged) ---
const suits = ["hearts", "diamonds", "clubs", "spades"];
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
  const finalRank = rank || 'king'; 
  return { rank: finalRank, suit, file: `${finalRank}_of_${suit}.svg`, value: pointValue };
}

// Helper: Generate a hand that results in a specific point total
function generateHandPoints(points) {
    let hand = [];
    
    let card1Value = Math.floor(Math.random() * 10);
    let card2Value = (points - card1Value + 10) % 10;
    
    hand.push(createCardWithPoint(card1Value));
    hand.push(createCardWithPoint(card2Value));
    
    if (Math.random() < 0.3) {
        hand.push(createCardWithPoint(0));
    }
    
    return hand;
}

// --- Biased Winner Determination Logic (70% User Loss) (unchanged) ---
function determineBiasedWinner(pBet, bBet, tBet) {
    const betsPlaced = [];
    if (pBet > 0) betsPlaced.push("player");
    if (bBet > 0) betsPlaced.push("banker");
    if (tBet > 0) betsPlaced.push("tie");

    const loseOptions = ["player", "banker", "tie"].filter(opt => !betsPlaced.includes(opt));
    const rng = Math.random();

    // Standard Baccarat probabilities used if player bets all 3 or for loss options
    const BANKER_WIN_PROB = 0.458; 
    const PLAYER_WIN_PROB = 0.446; 

    if (betsPlaced.length === 3) {
        if (rng < BANKER_WIN_PROB) return 'banker'; 
        if (rng < (BANKER_WIN_PROB + PLAYER_WIN_PROB)) return 'player';
        return 'tie';
    } else {
        // 70% chance to lose ALL placed bets
        if (rng < 0.70 && loseOptions.length > 0) {
            return loseOptions[Math.floor(Math.random() * loseOptions.length)];
        } 
        // 30% chance to win ONE of the placed bets
        else {
            return betsPlaced[Math.floor(Math.random() * betsPlaced.length)];
        }
    }
}

// --- Biased Hand Generation (unchanged) ---
function generateWinningHand(winner) {
    let playerPoints, bankerPoints;

    if (winner === 'player') {
        playerPoints = Math.floor(Math.random() * 3) + 7; 
        bankerPoints = Math.floor(Math.random() * 7);    
        if (playerPoints <= bankerPoints) playerPoints = (bankerPoints + 1) % 10; 

    } else if (winner === 'banker') {
        bankerPoints = Math.floor(Math.random() * 3) + 7; 
        playerPoints = Math.floor(Math.random() * 7);    
        if (bankerPoints <= playerPoints) bankerPoints = (playerPoints + 1) % 10; 

    } else { // winner === 'tie'
        const tiePoint = Math.floor(Math.random() * 10); 
        playerPoints = tiePoint;
        bankerPoints = tiePoint;
    }

    const playerHand = generateHandPoints(playerPoints);
    const bankerHand = generateHandPoints(bankerPoints);

    const finalPlayerPoints = calculatePoints(playerHand);
    const finalBankerPoints = calculatePoints(bankerHand);

    return { 
        winner, 
        player: { cards: playerHand, points: finalPlayerPoints }, 
        banker: { cards: bankerHand, points: finalBankerPoints }
    };
}


// --- Main Controller for Multi-Bet Baccarat (FIXED PROFIT CALCULATION) ---
exports.playBaccarat = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { betPlayer = 0, betBanker = 0, betTie = 0 } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success:false, message:"User not found" });

    const pBet = parseFloat(betPlayer) || 0;
    const bBet = parseFloat(betBanker) || 0;
    const tBet = parseFloat(betTie) || 0;
    
    const totalBet = pBet + bBet + tBet;

    if (totalBet <= 0) return res.status(400).json({ success:false, message:"No valid bets placed." });
    if (totalBet > user.chips) return res.status(400).json({ success:false, message:"Insufficient chips." });

    // Deduct total bet upfront
    user.chips -= totalBet;

    // 1. Determine the winner based on RTP model
    const winner = determineBiasedWinner(pBet, bBet, tBet);
    
    // 2. Generate a card hand that matches the determined winner
    const gameResult = generateWinningHand(winner);

    // 3. Calculate payouts (Standard profit always calculated for a win)
    let winnings = 0; 
    let profit = 0;   

    if (winner === "tie") {
        // Tie Bet: Pays 8:1
        if (tBet > 0) {
            const tieProfit = tBet * 8; 
            winnings += tBet + tieProfit; // Original bet + Profit
            profit += tieProfit;
        }
        // Player and Banker Bets: PUSH (Original bet returned)
        winnings += pBet;
        winnings += bBet;

    } else if (winner === "player") {
        // Player Bet: Pays 1:1
        if (pBet > 0) {
            const playerProfit = pBet * 1; 
            winnings += pBet + playerProfit; // Original bet + Profit
            profit += playerProfit;
        }
        
    } else if (winner === "banker") {
        // Banker Bet: Pays 0.95:1
        if (bBet > 0) {
            const bankerProfit = bBet * 0.95;
            winnings += bBet + bankerProfit; // Original bet + Profit
            profit += bankerProfit;
        }
    }

    // Final chip update: adds the total amount returned (stake + profit)
    user.chips += winnings;
    
    await user.save(); 

    return res.json({
      success: true,
      result: winner,
      player: gameResult.player,
      banker: gameResult.banker,
      profit: profit,
      balance: user.chips
    });

  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success:false, message:"Internal server error" });
  }
};