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
// NOTE: These endpoints must be correctly set up in your Express router
const API_URL = '/blackjack';
const ENDPOINTS = {
    start: `${API_URL}/start`,
    hit: `${API_URL}/hit`,
    stand: `${API_URL}/stand`
};
// --------------------------------------------------

// --------------------------------------------------
// CARD / SCORE UTILS (Kept for local display purposes)
// --------------------------------------------------
// NOTE: createDeck function is no longer needed on the frontend.

function cardValue(card) {
  // Frontend cards from backend use 'rank' and 'suit', not 'val' and 'suit'
  const val = card.rank || card.val; 
  if (['J','Q','K'].includes(val)) return 10;
  if (val === 'A') return 11;
  return parseInt(val);
}

function calcScore(cards) {
  let score = cards.reduce((a, c) => a + cardValue(c), 0);
  let aces = cards.filter(c => (c.rank || c.val) === 'A').length;
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function getCardFilename(card) {
  // Convert backend format (rank/suit) to filename format
  const v = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }[card.rank || card.val] || (card.rank || card.val);
  const s = card.suit.toLowerCase(); // Backend suits are 'hearts', 'spades', etc.
  return `${v}_of_${s}.svg`;
}

// --------------------------------------------------
// RENDER
// --------------------------------------------------
// ... (renderCard function remains the same) ...
function renderCard(card, container, hidden = false, delay = 0) {
  const div = document.createElement('div');
  div.classList.add('card');
  
  // Flag for placeholder cards (mostly for initial table setup)
  if (card.placeholder) div.classList.add('placeholder-card'); 

  const inner = document.createElement('div');
  inner.classList.add('card-inner');
  div.appendChild(inner);

  const back = document.createElement('div');
  back.classList.add('card-back');
  inner.appendChild(back);

  const front = document.createElement('div');
  front.classList.add('card-front');
  
  // Handle hidden cards from the backend
  if (card.hidden) {
    div.classList.add('hidden-dealer-card');
  } else if (!card.placeholder) {
    front.innerHTML = `<img src="/images/playing-cards/${getCardFilename(card)}" alt="${card.rank} of ${card.suit}">`;
  }
  inner.appendChild(front);

  container.appendChild(div);

  setTimeout(() => {
    if (!hidden && !card.hidden) div.classList.add('flipped');
  }, delay);
}


// --------------------------------------------------
// SCORE / BALANCE DISPLAY
// --------------------------------------------------
function updateScores(hideDealer = true) {
  // Use local card arrays for display score
  playerScoreEl.textContent = `Player: ${calcScore(playerCards)}`;
  
  // NOTE: Dealer score calculation is simplified here for display purposes.
  // The backend determines the true, final dealer score.
  if (hideDealer) {
    const visibleCard = dealerCards.find(c => !c.hidden);
    const visibleScore = visibleCard ? cardValue(visibleCard) : '?';
    dealerScoreEl.textContent = `Dealer: ${visibleScore} + ?`;
  } else {
    dealerScoreEl.textContent = `Dealer: ${calcScore(dealerCards)}`;
  }
}

// ⚠️ IMPORTANT: updateBalanceDisplay is simplified as the backend is authoritative
function updateBalanceDisplay(newBalance) {
  balance = parseFloat(newBalance.toFixed(2));
  balanceEl.textContent = balance;
  // NOTE: Removed balance glow class toggling and timeout
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
  // No need to check balance here, the backend will handle the final validation.
  currentBet = bet;
  resultText.textContent = `Bet set to: ${bet} 💰. Click Deal.`;
  dealBtn.disabled = false;
};

// --------------------------------------------------
// DEAL CARDS (Now initiates the game via API)
// --------------------------------------------------
dealBtn.onclick = async () => {
  if (currentBet <= 0) {
    resultText.textContent = 'Place your bet first.';
    return;
  }

  // UI Setup
  dealerHand.innerHTML = '';
  playerHand.innerHTML = '';
  resultText.textContent = 'Contacting server...';
  
  // Disable buttons while waiting for API
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
      // Re-enable bet if start failed (e.g., insufficient funds)
      resultText.textContent = data.message || 'Error starting game.';
      dealBtn.disabled = false;
      return;
    }

    // Update local state from server
    playerCards = data.playerHand;
    dealerCards = data.dealerHand;
    updateBalanceDisplay(data.balance); // Deducted bet is reflected here
    gameActive = true;

    resultText.textContent = 'Dealing...';

    // Render cards based on server state
    // Dealer's second card is marked { hidden: true } by the server
    renderCard(playerCards[0], playerHand, false, 200);
    renderCard(dealerCards[0], dealerHand, false, 500);
    renderCard(playerCards[1], playerHand, false, 800);
    renderCard(dealerCards[1], dealerHand, true, 1100);

    setTimeout(() => {
        updateScores(true);
        // Check for immediate Blackjack (handled by backend logic now)
        if (data.result) {
             // result will be set to 'Blackjack! You win 💰' if applicable
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

// --------------------------------------------------
// PLAYER ACTIONS (Now call API)
// --------------------------------------------------
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

    // Add the new card to local state and render it
    const newCard = data.playerHand[data.playerHand.length - 1];
    playerCards.push(newCard);
    renderCard(newCard, playerHand, false, 150);
    updateScores(true);

    if (data.result) {
      // Game over (Bust)
      endGame(data.result, 'loss'); // Backend only returns 'Bust!' on loss
    } else {
      // Game continues
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
    const hiddenCardEl = dealerHand.querySelector('.hidden-dealer-card');
    if (hiddenCardEl) {
        hiddenCardEl.classList.remove('hidden-dealer-card');
        hiddenCardEl.classList.add('flipped');
    }
    
    // Update local dealer cards to show the flipped card and any subsequent hits
    dealerCards = data.dealerHand; 

    // Animate the dealer's play and then end the game
    await playDealerSequence(data);

  } catch (error) {
    console.error('Stand error:', error);
    resultText.textContent = 'A connection error occurred.';
    dealBtn.disabled = false;
  }
};

// --------------------------------------------------
// DEALER LOGIC (Mostly for animation now)
// --------------------------------------------------
async function playDealerSequence(data) {
    const initialDealerCount = dealerCards.length;
    let currentCardsToRender = initialDealerCount;

    const loop = (i) => new Promise(resolve => {
        if (i >= data.dealerHand.length) {
            resolve(); // All cards rendered
            return;
        }

        const newCard = data.dealerHand[i];
        renderCard(newCard, dealerHand, false, 200);
        
        // Use the final score from the backend for the score display update
        dealerScoreEl.textContent = `Dealer: ${data.dealerScore}`;

        setTimeout(() => {
            loop(i + 1).then(resolve);
        }, 800); // Wait for card flip animation
    });

    // Start rendering from the 3rd card (index 2), as the first two are already drawn
    await loop(initialDealerCount); 
    
    // Once the dealer's turn is complete, finalize the round
    endGame(data.result, data.result.includes('win') ? 'win' : data.result.includes('loss') ? 'loss' : 'push', data.balance);
}

// --------------------------------------------------
// END GAME + PAYOUTS (Payout is now handled by backend)
// --------------------------------------------------
function endGame(message, resultType, newBalance) {
  gameActive = false;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  dealBtn.disabled = false;
  
  // Show final scores
  updateScores(false); 

  // Update balance with the authoritative figure from the last API call
  if (newBalance !== undefined) {
    updateBalanceDisplay(newBalance);
  }

  // Current bet is reset regardless of outcome, as the round is over
  currentBet = 0; 
  
  // Display result message
  resultText.classList.remove('show-result');
  void resultText.offsetWidth; // restart animation
  resultText.textContent = message;
  resultText.classList.add('show-result');
}

// --------------------------------------------------
// INITIALIZATION
// --------------------------------------------------
function initializeTable() {
    // ... (same as before) ...
    // Create a dummy card object that the renderer can use to draw the back face
    const dummyCard = { rank: 'D', suit: 'D', placeholder: true }; 
    
    // Clear hands (in case it runs after a game)
    dealerHand.innerHTML = '';
    playerHand.innerHTML = '';
    
    // Draw 2 card backs for the player
    renderCard(dummyCard, playerHand, true, 0); 
    renderCard(dummyCard, playerHand, true, 100); 
    
    // Draw 2 card backs for the dealer
    renderCard(dummyCard, dealerHand, true, 200);
    renderCard(dummyCard, dealerHand, true, 300);

    // Reset scores to 0
    dealerScoreEl.textContent = `Dealer: 0`;
    playerScoreEl.textContent = `Player: 0`;
    dealBtn.disabled = true; // Wait for bet
    hitBtn.disabled = true;
    standBtn.disabled = true;
}

// Run initialization when the script loads
initializeTable();