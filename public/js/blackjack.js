// blackjack.js — CashMash Blackjack (Ultimate Edition)

const dealerHand = document.getElementById('dealerHand');
const playerHand = document.getElementById('playerHand');
const dealerScoreEl = document.getElementById('dealerScore');
const playerScoreEl = document.getElementById('playerScore');
const resultText = document.getElementById('resultText');

const betAmountEl = document.getElementById('betAmount');
const placeBetBtn = document.getElementById('placeBetBtn');
const dealBtn = document.getElementById('dealBtn');
const hitBtn = document.getElementById('hitBtn');
const standBtn = document.getElementById('standBtn');
const balanceEl = document.getElementById('balance');

let deck = [];
let playerCards = [];
let dealerCards = [];
let gameActive = false;
let currentBet = 0;
let balance = parseFloat(balanceEl.textContent) || 0;

// --------------------------------------------------
// CARD / SCORE UTILS
// --------------------------------------------------
function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  deck = [];
  for (let s of suits) for (let v of values) deck.push({ suit: s, val: v });
  deck.sort(() => Math.random() - 0.5);
}

function cardValue(card) {
  if (['J','Q','K'].includes(card.val)) return 10;
  if (card.val === 'A') return 11;
  return parseInt(card.val);
}

function calcScore(cards) {
  let score = cards.reduce((a, c) => a + cardValue(c), 0);
  let aces = cards.filter(c => c.val === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function getCardFilename(card) {
  const v = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }[card.val] || card.val;
  const s = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[card.suit];
  return `${v}_of_${s}.svg`;
}

// --------------------------------------------------
// RENDER
// --------------------------------------------------
function renderCard(card, container, hidden = false, delay = 0) {
  const div = document.createElement('div');
  div.classList.add('card');
  
  // Flag for placeholder cards
  if (card.placeholder) div.classList.add('placeholder-card'); 

  const inner = document.createElement('div');
  inner.classList.add('card-inner');
  div.appendChild(inner);

  const back = document.createElement('div');
  back.classList.add('card-back');
  inner.appendChild(back);

  const front = document.createElement('div');
  front.classList.add('card-front');
  
  // Only insert the image if it's not a placeholder
  if (!card.placeholder) {
    front.innerHTML = `<img src="/images/playing-cards/${getCardFilename(card)}" alt="${card.val} of ${card.suit}">`;
  }
  inner.appendChild(front);

  if (hidden) div.classList.add('hidden-dealer-card');
  container.appendChild(div);

  setTimeout(() => {
    if (!hidden) div.classList.add('flipped');
  }, delay);
}

// --------------------------------------------------
// SCORE / BALANCE DISPLAY
// --------------------------------------------------
function updateScores(hideDealer = true) {
  playerScoreEl.textContent = `Player: ${calcScore(playerCards)}`;
  dealerScoreEl.textContent = hideDealer ? `Dealer: ?` : `Dealer: ${calcScore(dealerCards)}`;
}

function updateBalanceDisplay(change = 0) {
  balance += change;
  balance = parseFloat(balance.toFixed(2));
  balanceEl.textContent = balance;

  balanceEl.classList.remove('profit', 'loss');
  if (change > 0) {
    balanceEl.classList.add('profit');
  } else if (change < 0) {
    balanceEl.classList.add('loss');
  }

  // Remove glow after short delay
  setTimeout(() => {
    balanceEl.classList.remove('profit', 'loss');
  }, 1500);
}

// --------------------------------------------------
// MAIN GAME FLOW
// --------------------------------------------------
placeBetBtn.onclick = () => {
  const bet = parseFloat(betAmountEl.value);
  if (!bet || bet <= 0 || bet > balance) {
    resultText.textContent = 'Invalid bet amount.';
    return;
  }
  currentBet = bet;
  resultText.textContent = `Bet placed: ${bet} 💰`;
  updateBalanceDisplay(-bet);
  dealBtn.disabled = false;
};

dealBtn.onclick = () => {
  if (currentBet <= 0) {
    resultText.textContent = 'Place your bet first.';
    return;
  }

  createDeck();
  playerCards = [];
  dealerCards = [];
  dealerHand.innerHTML = '';
  playerHand.innerHTML = '';
  resultText.textContent = 'Dealing...';
  gameActive = true;
  hitBtn.disabled = false;
  standBtn.disabled = false;
  dealBtn.disabled = true;

  // Deal cards with a sequence of delays
  playerCards.push(deck.pop());
  renderCard(playerCards[0], playerHand, false, 200);

  dealerCards.push(deck.pop());
  renderCard(dealerCards[0], dealerHand, false, 500);

  playerCards.push(deck.pop());
  renderCard(playerCards[1], playerHand, false, 800);

  dealerCards.push(deck.pop());
  renderCard(dealerCards[1], dealerHand, true, 1100);

  setTimeout(() => {
    updateScores(true);
    resultText.textContent = 'Hit or Stand?';
    if (calcScore(playerCards) === 21) {
      setTimeout(() => endGame('Blackjack! You win 💰', 'win'), 1000);
    }
  }, 1300);
};

// --------------------------------------------------
// PLAYER ACTIONS
// --------------------------------------------------
hitBtn.onclick = () => {
  if (!gameActive) return;
  const card = deck.pop();
  playerCards.push(card);
  renderCard(card, playerHand, false, 150);
  updateScores(true);

  if (calcScore(playerCards) > 21) {
    endGame('Bust! Dealer wins ❌', 'loss');
  }
};

standBtn.onclick = () => {
  if (!gameActive) return;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  const hiddenCard = dealerHand.querySelector('.hidden-dealer-card');
  if (hiddenCard) {
    hiddenCard.classList.remove('hidden-dealer-card');
    hiddenCard.classList.add('flipped');
  }
  setTimeout(playDealer, 700);
};

// --------------------------------------------------
// DEALER LOGIC
// --------------------------------------------------
function playDealer() {
  const loop = () => {
    const score = calcScore(dealerCards);
    updateScores(false);
    if (score < 17) {
      const card = deck.pop();
      dealerCards.push(card);
      renderCard(card, dealerHand, false, 200);
      setTimeout(loop, 800);
    } else {
      setTimeout(finishRound, 600);
    }
  };
  loop();
}

function finishRound() {
  const dealerScore = calcScore(dealerCards);
  const playerScore = calcScore(playerCards);
  let message = '';
  let resultType = '';

  if (dealerScore > 21 && playerScore <= 21) {
    message = 'Dealer busts! You win 💰';
    resultType = 'win';
  } else if (playerScore > 21) {
    message = 'You bust! Dealer wins ❌';
    resultType = 'loss';
  } else if (playerScore > dealerScore) {
    message = 'You win 💰';
    resultType = 'win';
  } else if (playerScore < dealerScore) {
    message = 'Dealer wins ❌';
    resultType = 'loss';
  } else {
    message = 'Push 🤝';
    resultType = 'push';
  }

  endGame(message, resultType);
}

// --------------------------------------------------
// END GAME + PAYOUTS
// --------------------------------------------------
function endGame(message, resultType) {
  gameActive = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = false;
  updateScores(false);

  if (resultType === 'win') {
    // Blackjack pays 1.5x, win pays 1x (2x return - bet)
    const payout = (playerCards.length === 2 && calcScore(playerCards) === 21) ? currentBet * 2.5 : currentBet * 2;
    updateBalanceDisplay(payout);
  } else if (resultType === 'push') {
    updateBalanceDisplay(currentBet);
  }

  resultText.classList.remove('show-result');
  void resultText.offsetWidth; // restart animation
  resultText.textContent = message;
  resultText.classList.add('show-result');

  currentBet = 0;
}

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------
function initializeTable() {
    // Create a dummy card object that the renderer can use to draw the back face
    const dummyCard = { val: 'D', suit: 'D', placeholder: true }; 
    
    // Clear hands (in case it runs after a game)
    dealerHand.innerHTML = '';
    playerHand.innerHTML = '';
    
    // Draw 2 card backs for the player
    renderCard(dummyCard, playerHand, true, 0); // hidden=true ensures it stays as a card back
    renderCard(dummyCard, playerHand, true, 100); 
    
    // Draw 2 card backs for the dealer
    renderCard(dummyCard, dealerHand, true, 200);
    renderCard(dummyCard, dealerHand, true, 300);

    // Reset scores to 0
    dealerScoreEl.textContent = `Dealer: 0`;
    playerScoreEl.textContent = `Player: 0`;
    dealBtn.disabled = true; // Wait for bet
}

// Run initialization when the script loads
initializeTable();