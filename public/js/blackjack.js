// js/blackjack.js
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

// NOTE: deck, playerCards, dealerCards, gameActive, balance are now primarily
// managed by the backend. We'll keep local copies for rendering/display.
let playerCards = [];
let dealerCards = [];
let gameActive = false;
let currentBet = 0;
// Initial balance is read once, subsequent changes come from the backend response.
let balance = parseFloat(balanceEl.textContent) || 0;

// --- UTILITY: Server Endpoint Configuration ---
const API_URL = '/blackjack';
const ENDPOINTS = {
  start: `${API_URL}/start`,
  hit: `${API_URL}/hit`,
  stand: `${API_URL}/stand`
};
// --------------------------------------------------

// --------------------------------------------------
// CARD / SCORE UTILS (Updated with safety check 👈)
// --------------------------------------------------
function cardValue(card) {
  const val = card.rank || card.val;
  if (['J', 'Q', 'K'].includes(val)) return 10;
  if (val === 'A') return 11;
  return parseInt(val);
}

function calcScore(cards) {
  // 🐛 FIX: Check if cards is a valid array before attempting to reduce it
  if (!Array.isArray(cards) || cards.length === 0) {
    return 0;
  }
  
  let score = cards.reduce((a, c) => a + cardValue(c), 0);
  let aces = cards.filter(c => (c.rank || c.val) === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function getCardFilename(card) {
  const v = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }[card.rank || card.val] || (card.rank || card.val);
  const s = card.suit.toLowerCase();
  return `${v}_of_${s}.svg`;
}

// --------------------------------------------------
// RENDER (FIXED)
// --------------------------------------------------
function renderCard(card, container, hidden = false, delay = 0) {
  const div = document.createElement('div');
  div.classList.add('card');

  if (card.placeholder) div.classList.add('placeholder-card');

  const inner = document.createElement('div');
  inner.classList.add('card-inner');
  div.appendChild(inner);

  const back = document.createElement('div');
  back.classList.add('card-back');
  inner.appendChild(back);

  const front = document.createElement('div');
  front.classList.add('card-front');
  inner.appendChild(front);

  // 🚨 FIX: Set the image source for all non-placeholder cards
  if (!card.placeholder) {
    const filename = getCardFilename(card);
    front.innerHTML = `<img src="/images/playing-cards/${filename}" alt="${card.rank} of ${card.suit}">`;
  }

  // 🚨 FIX: Handle hidden cards (should only be the dealer's initial second card)
  // If the server explicitly marks it as hidden, or if 'hidden' flag is passed (for initial dealer card)
  if (card.hidden || hidden) {
    div.classList.add('hidden-dealer-card');
  }

  container.appendChild(div);

  setTimeout(() => {
    // 🚨 FIX: Flip the card only if it's NOT supposed to be hidden
    if (!card.hidden && !hidden) div.classList.add('flipped');
  }, delay);

  return div; // Return the card element for later use (like flipping hidden card)
}

// --------------------------------------------------
// UTILITY: Card Flipping
// --------------------------------------------------
/**
 * Finds the currently hidden dealer card element and flips it to be visible.
 */
function flipHiddenDealerCard() {
  const hiddenCardEl = dealerHand.querySelector('.hidden-dealer-card');
  if (hiddenCardEl) {
    hiddenCardEl.classList.remove('hidden-dealer-card');
    // Add a slight delay for the flip animation to look good
    setTimeout(() => hiddenCardEl.classList.add('flipped'), 10);
  }
}

// --------------------------------------------------
// SCORE / BALANCE DISPLAY (Remains the same)
// --------------------------------------------------
function updateScores(hideDealer = true) {
  playerScoreEl.textContent = `Player: ${calcScore(playerCards)}`;

  if (hideDealer) {
    // This relies on calcScore being safe with null/undefined data
    const visibleCard = dealerCards.find(c => !c.hidden);
    const visibleScore = visibleCard ? cardValue(visibleCard) : '?';
    dealerScoreEl.textContent = `Dealer: ${visibleScore} + ?`;
  } else {
    // This relies on calcScore being safe with null/undefined data
    dealerScoreEl.textContent = `Dealer: ${calcScore(dealerCards)}`;
  }
}

function updateBalanceDisplay(newBalance) {
  balance = parseFloat(newBalance.toFixed(2));
  balanceEl.textContent = balance;
}

// --------------------------------------------------
// MAIN GAME FLOW
// --------------------------------------------------
placeBetBtn.onclick = () => {
  const bet = parseFloat(betAmountEl.value);
  if (!bet || bet <= 0) {
    resultText.textContent = 'Invalid bet amount.';
    return;
  }
  currentBet = bet;
  resultText.textContent = `Bet set to: ${bet} 💰. Click Deal.`;
  placeBetBtn.disabled = true;
  dealBtn.disabled = false;
};

// DEAL CARDS (Updated for immediate game end)
dealBtn.onclick = async () => {
  if (currentBet <= 0) {
    resultText.textContent = 'Place your bet first.';
    return;
  }

  dealerHand.innerHTML = '';
  playerHand.innerHTML = '';
  resultText.textContent = 'Contacting server...';

  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = true;

  try {
    const response = await fetch(ENDPOINTS.start, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: currentBet })
    });

    const data = await response.json();

    if (response.status !== 200) {
      resultText.textContent = data.message || 'Error starting game.';
      dealBtn.disabled = false;
      return;
    }

    playerCards = data.playerHand;
    dealerCards = data.dealerHand;
    updateBalanceDisplay(data.balance);
    gameActive = true;

    resultText.textContent = 'Dealing...';

    // Render cards based on server state
    // Note: data.dealerHand[1] should have { hidden: true } from the server
    renderCard(playerCards[0], playerHand, false, 200);
    renderCard(dealerCards[0], dealerHand, false, 500);
    renderCard(playerCards[1], playerHand, false, 800);
    renderCard(dealerCards[1], dealerHand, true, 1100); // Pass true to use local 'hidden-dealer-card' class

    setTimeout(() => {
      updateScores(true);
      if (data.result) {
        // REVEAL DEALER CARD on immediate game end (Blackjack/Push)
        flipHiddenDealerCard(); 
        endGame(data.result, data.result.includes('win') ? 'win' : 'loss', data.balance);
      } else {
        resultText.textContent = 'Hit or Stand?';
        hitBtn.disabled = false;
        standBtn.disabled = false;
      }
    }, 1300);

  } catch (error) {
    console.error('Deal error:', error);
    resultText.textContent = 'A connection error occurred.';
    dealBtn.disabled = false;
  }
};

// PLAYER ACTIONS (Fixed the state update on bust 👈)
hitBtn.onclick = async () => {
  if (!gameActive) return;

  hitBtn.disabled = true;
  standBtn.disabled = true;

  try {
    const response = await fetch(ENDPOINTS.hit, { method: 'POST' });
    const data = await response.json();

    if (response.status !== 200) {
      resultText.textContent = data.message || 'Error executing hit.';
      hitBtn.disabled = false;
      standBtn.disabled = false;
      return;
    }
    
    // Always update playerCards to the full hand received from the server
    playerCards = data.playerHand; 
    const newCard = data.playerHand[data.playerHand.length - 1];
    // Note: If the backend already sent the full array, pushing here would double the card.
    // Assuming the backend sends the full array *including* the new card:
    renderCard(newCard, playerHand, false, 150);
    updateScores(true);

    if (data.result) {
      // 🐛 CRITICAL FIX: Ensure both playerCards and dealerCards are set from data.
      // playerCards was updated above.
      dealerCards = data.dealerHand; 

      // REVEAL DEALER CARD on player bust
      flipHiddenDealerCard();
      endGame(data.result, 'loss', data.balance); // Pass balance for immediate bust/end
    } else {
      hitBtn.disabled = false;
      standBtn.disabled = false;
    }

  } catch (error) {
    console.error('Hit error:', error);
    resultText.textContent = 'A connection error occurred.';
    hitBtn.disabled = false;
    standBtn.disabled = false;
  }
};

// STAND (Updated to use flipHiddenDealerCard)
standBtn.onclick = async () => {
  if (!gameActive) return;

  hitBtn.disabled = true;
  standBtn.disabled = true;
  resultText.textContent = 'Standing... Dealer playing...';

  try {
    const response = await fetch(ENDPOINTS.stand, { method: 'POST' });
    const data = await response.json();

    if (response.status !== 200) {
      resultText.textContent = data.message || 'Error executing stand.';
      return;
    }

    // Flip the hidden dealer card
    dealerCards = data.dealerHand; // Update local state with the now-revealed card
    flipHiddenDealerCard(); 
    
    // Update score now that the first two cards are visible
    updateScores(false);

    // Animate the dealer's play and then end the game
    await playDealerSequence(data);

  } catch (error) {
    console.error('Stand error:', error);
    resultText.textContent = 'A connection error occurred.';
    dealBtn.disabled = false;
  }
};

// --------------------------------------------------
// DEALER LOGIC (FIXED)
// --------------------------------------------------
async function playDealerSequence(data) {
  // We already rendered the first two cards. Start rendering from the third card (index 2).
  const startRenderIndex = 2;

  // data.dealerHand is the FINAL array of dealer cards from the server
  const newCards = data.dealerHand.slice(startRenderIndex);

  // Update local state (already done in standBtn.onclick, but safe to re-assign)
  dealerCards = data.dealerHand;

  const loop = (i) => new Promise(resolve => {
    if (i >= newCards.length) {
      resolve(); // All new cards rendered
      return;
    }

    const cardToRender = newCards[i];

    // 🚨 FIX: Render the card. It will automatically flip due to renderCard fix.
    renderCard(cardToRender, dealerHand, false, 200);

    // Update score for each hit
    dealerScoreEl.textContent = `Dealer: ${calcScore(dealerCards.slice(0, startRenderIndex + i + 1))}`;

    setTimeout(() => {
      loop(i + 1).then(resolve);
    }, 800); // Wait for card flip animation
  });

  await loop(0); // Start the loop for the new cards

  // Once the dealer's turn is complete, finalize the round
  endGame(data.result, data.result.includes('win') ? 'win' : data.result.includes('loss') ? 'loss' : 'push', data.balance);
}

// --------------------------------------------------
// END GAME + PAYOUTS (Remains the same)
// --------------------------------------------------
// --------------------------------------------------
// END GAME + PAYOUTS (Updated with delay)
// --------------------------------------------------
function endGame(message, resultType, newBalance) {
  gameActive = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = true;
  placeBetBtn.disabled = false;

  setTimeout(() => {
    updateScores(false); // Now displays the final, revealed dealer score

    if (newBalance !== undefined) {
      updateBalanceDisplay(newBalance);
    }

    currentBet = 0;

    resultText.classList.remove('show-result');
    void resultText.offsetWidth;
    resultText.textContent = message;
    resultText.classList.add('show-result');
  }, 100); // 100ms should be sufficient for the flip animation
}

// --------------------------------------------------
// INITIALIZATION (Remains the same)
// --------------------------------------------------
function initializeTable() {
  const dummyCard = { rank: 'D', suit: 'D', placeholder: true };

  dealerHand.innerHTML = '';
  playerHand.innerHTML = '';

  // Draw 2 card backs for the player
  renderCard(dummyCard, playerHand, true, 0);
  renderCard(dummyCard, playerHand, true, 100);

  // Draw 2 card backs for the dealer
  renderCard(dummyCard, dealerHand, true, 200);
  renderCard(dummyCard, dealerHand, true, 300);

  dealerScoreEl.textContent = `Dealer: 0`;
  playerScoreEl.textContent = `Player: 0`;
  dealBtn.disabled = true;
  hitBtn.disabled = true;
  standBtn.disabled = true;
}

initializeTable();