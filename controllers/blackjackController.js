// controllers/blackjackController.js

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

  // Adjust Aces from 11 → 1 if needed
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
}

function createDeck() {
  const suits = ['hearts', 'spades', 'clubs', 'diamonds'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  suits.forEach(suit => {
    ranks.forEach(rank => deck.push({ rank, suit }));
  });

  return deck.sort(() => Math.random() - 0.5);
}

let deck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;
let result = '';

exports.startGame = (req, res) => {
  deck = createDeck();
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];
  gameOver = false;
  result = '';

  res.json({
    playerHand,
    dealerHand: [dealerHand[0], { hidden: true }],
    playerScore: calculateScore(playerHand),
    dealerScore: getCardValue(dealerHand[0]),
    result: null
  });
};

exports.hit = (req, res) => {
  if (gameOver) return res.json({ result, playerHand, dealerHand });

  playerHand.push(deck.pop());
  const playerScore = calculateScore(playerHand);

  if (playerScore > 21) {
    result = 'Player Bust! Dealer Wins!';
    gameOver = true;
  }

  res.json({
    playerHand,
    playerScore,
    result: gameOver ? result : null
  });
};

exports.stand = (req, res) => {
  if (gameOver) return res.json({ result, playerHand, dealerHand });

  let dealerScore = calculateScore(dealerHand);
  const playerScore = calculateScore(playerHand);

  // Dealer hits until >=17
  while (dealerScore < 17) {
    dealerHand.push(deck.pop());
    dealerScore = calculateScore(dealerHand);
  }

  if (dealerScore > 21) {
    result = 'Dealer Bust! Player Wins!';
  } else if (dealerScore > playerScore) {
    result = 'Dealer Wins!';
  } else if (dealerScore < playerScore) {
    result = 'Player Wins!';
  } else {
    result = 'Push (Tie)!';
  }

  gameOver = true;

  res.json({
    dealerHand,
    dealerScore,
    playerScore,
    result
  });
};
