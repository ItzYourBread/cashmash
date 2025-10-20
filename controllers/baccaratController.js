// controllers/baccaratController.js

// Card and point logic
const suits = ["hearts", "diamonds", "clubs", "spades"];
const ranks = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];

const cardValues = {
  "ace": 1,
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 0, "jack": 0, "queen": 0, "king": 0
};

// Helper: create shuffled deck
function generateDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, file: `${rank}_of_${suit}.svg`, value: cardValues[rank] });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

// Calculate total points (mod 10)
function calculatePoints(hand) {
  const total = hand.reduce((sum, card) => sum + card.value, 0);
  return total % 10;
}

// Baccarat draw rule logic
function drawThirdCardRule(playerPoints, bankerPoints, playerThirdCard) {
  // Player rule
  let playerDraws = playerPoints <= 5;

  // Banker rule
  let bankerDraws = false;
  if (!playerDraws) {
    if (bankerPoints <= 5) bankerDraws = true;
  } else {
    // Complex banker draw rule when player draws
    const ptc = playerThirdCard ? playerThirdCard.value : null;
    if (bankerPoints <= 2) bankerDraws = true;
    else if (bankerPoints === 3 && ptc !== 8) bankerDraws = true;
    else if (bankerPoints === 4 && ptc >= 2 && ptc <= 7) bankerDraws = true;
    else if (bankerPoints === 5 && ptc >= 4 && ptc <= 7) bankerDraws = true;
    else if (bankerPoints === 6 && (ptc === 6 || ptc === 7)) bankerDraws = true;
  }

  return { playerDraws, bankerDraws };
}

// Main game controller
exports.playBaccarat = async (req, res) => {
  try {
    const { bet, choice } = req.body; // choice = "player" | "banker" | "tie"

    // ✅ Step 1: Generate deck
    const deck = generateDeck();

    // ✅ Step 2: Deal initial hands
    const playerHand = [deck.pop(), deck.pop()];
    const bankerHand = [deck.pop(), deck.pop()];

    // ✅ Step 3: Check totals
    let playerPoints = calculatePoints(playerHand);
    let bankerPoints = calculatePoints(bankerHand);

    // ✅ Step 4: Natural rule (8 or 9 → no draw)
    if (playerPoints < 8 && bankerPoints < 8) {
      const { playerDraws } = drawThirdCardRule(playerPoints, bankerPoints, null);

      // Player draw first
      if (playerDraws) {
        const playerThird = deck.pop();
        playerHand.push(playerThird);
        playerPoints = calculatePoints(playerHand);
      }

      // Banker draw depends on player's third card
      const playerThirdCard = playerHand[2] || null;
      const { bankerDraws } = drawThirdCardRule(playerPoints, bankerPoints, playerThirdCard);

      if (bankerDraws) {
        const bankerThird = deck.pop();
        bankerHand.push(bankerThird);
        bankerPoints = calculatePoints(bankerHand);
      }
    }

    // ✅ Step 5: Determine result
    let winner;
    if (playerPoints > bankerPoints) winner = "player";
    else if (bankerPoints > playerPoints) winner = "banker";
    else winner = "tie";

    // ✅ Step 6: Calculate profit (simple multiplier)
    let multiplier = 0;
    if (winner === "player") multiplier = 2;
    else if (winner === "banker") multiplier = 1.95; // banker tax
    else if (winner === "tie") multiplier = 8;

    // TODO: Integrate with database balance later
    const profit = winner === choice ? bet * multiplier : 0;

    return res.json({
      success: true,
      result: winner,
      player: { cards: playerHand, points: playerPoints },
      banker: { cards: bankerHand, points: bankerPoints },
      profit
    });
  } catch (err) {
    console.error("Baccarat error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
