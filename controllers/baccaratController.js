const User = require('../models/User'); 

// --- Card and Point Logic ---
const suits = ["hearts", "diamonds", "clubs", "spades"];
const cardValues = {
  "ace":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,
  "10":0,"jack":0,"queen":0,"king":0
};

function calculatePoints(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0) % 10;
}

function createCardWithPoint(pointValue) {
  const rank = Object.keys(cardValues).find(k => cardValues[k] === pointValue);
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const finalRank = rank || 'king'; 
  return { rank: finalRank, suit, file: `${finalRank}_of_${suit}.svg`, value: pointValue };
}

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

function determineBiasedWinner(pBet, bBet, tBet) {
    const betsPlaced = [];
    if (pBet > 0) betsPlaced.push("player");
    if (bBet > 0) betsPlaced.push("banker");
    if (tBet > 0) betsPlaced.push("tie");

    const loseOptions = ["player", "banker", "tie"].filter(opt => !betsPlaced.includes(opt));
    const rng = Math.random();

    const BANKER_WIN_PROB = 0.458; 
    const PLAYER_WIN_PROB = 0.446; 

    if (betsPlaced.length === 3) {
        if (rng < BANKER_WIN_PROB) return 'banker'; 
        if (rng < (BANKER_WIN_PROB + PLAYER_WIN_PROB)) return 'player';
        return 'tie';
    } else {
        if (rng < 0.70 && loseOptions.length > 0) {
            return loseOptions[Math.floor(Math.random() * loseOptions.length)];
        } else {
            return betsPlaced[Math.floor(Math.random() * betsPlaced.length)];
        }
    }
}

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

    } else { // tie
        const tiePoint = Math.floor(Math.random() * 10); 
        playerPoints = tiePoint;
        bankerPoints = tiePoint;
    }

    const playerHand = generateHandPoints(playerPoints);
    const bankerHand = generateHandPoints(bankerPoints);

    return { 
        winner, 
        player: { cards: playerHand, points: calculatePoints(playerHand) }, 
        banker: { cards: bankerHand, points: calculatePoints(bankerHand) }
    };
}

// --- Main Baccarat Controller with Rakeback ---
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

    // Deduct total bet and track rakeback
    user.chips -= totalBet;
    user.totalWagered = (user.totalWagered || 0) + totalBet; // ✅ Track wager for rakeback

    const winner = determineBiasedWinner(pBet, bBet, tBet);
    const gameResult = generateWinningHand(winner);

    let winnings = 0; 
    let profit = 0;

    if (winner === "tie") {
        if (tBet > 0) {
            const tieProfit = tBet * 8;
            winnings += tBet + tieProfit;
            profit += tieProfit;
        }
        winnings += pBet;
        winnings += bBet;

    } else if (winner === "player") {
        if (pBet > 0) {
            const playerProfit = pBet * 1;
            winnings += pBet + playerProfit;
            profit += playerProfit;
        }
    } else if (winner === "banker") {
        if (bBet > 0) {
            const bankerProfit = bBet * 0.95;
            winnings += bBet + bankerProfit;
            profit += bankerProfit;
        }
    }

    user.chips += winnings;
    await user.save();

    return res.json({
      success: true,
      result: winner,
      player: gameResult.player,
      banker: gameResult.banker,
      profit,
      balance: user.chips
    });

  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success:false, message:"Internal server error" });
  }
};
