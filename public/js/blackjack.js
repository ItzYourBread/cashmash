document.addEventListener("DOMContentLoaded", () => {
    // ================= DOM ELEMENTS =================
    // Game Areas
    const dealerHand = document.getElementById('dealerHand');
    const playerHand = document.getElementById('playerHand');
    const dealerScoreEl = document.getElementById('dealerScoreDisplay');
    const playerScoreEl = document.getElementById('playerScoreDisplay');
    const tableMessage = document.getElementById('tableMessage');
    const popupMessage = document.getElementById('popupMessage');

    // Control Dock
    const btnDeal = document.getElementById('btnDeal');
    const btnHit = document.getElementById('btnHit');
    const btnStand = document.getElementById('btnStand');
    const ingameControls = document.getElementById('ingameControls');
    const balanceEl = document.getElementById('balance');
    const openBetModalBtn = document.getElementById('openBetModalBtn');
    const displayBetValue = document.getElementById('displayBetValue');

    // Modal Elements
    const betModal = document.getElementById("betModal");
    const modalBetInput = document.getElementById("modalBetInput");
    const confirmBetBtn = document.getElementById("confirmBet");
    const chipBtns = document.querySelectorAll(".chip-btn");
    const closeModalBtns = document.querySelectorAll(".close-modal");

    // ================= UTILS =================
    const formatChips = (amount) => {
        if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
        return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short', minimumFractionDigits: 1 }).format(amount);
    };

    const API_URL = '/blackjack';
    const ENDPOINTS = { start: `${API_URL}/start`, hit: `${API_URL}/hit`, stand: `${API_URL}/stand` };

    // ================= STATE =================
    let playerCards = [];
    let dealerCards = [];
    let gameActive = false;
    let currentBet = 10;
    let balance = parseFloat(balanceEl.dataset.rawBalance) || 1000;
    
    balanceEl.textContent = formatChips(balance);

    // ================= MODAL LOGIC =================
    openBetModalBtn.addEventListener("click", () => {
        if (gameActive) return showPopup("Finish current hand first!");
        betModal.classList.add("active");
    });

    closeModalBtns.forEach(btn => btn.addEventListener("click", () => betModal.classList.remove("active")));

    chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let currentVal = parseFloat(modalBetInput.value) || 0;
            if (btn.dataset.add) modalBetInput.value = currentVal + parseFloat(btn.dataset.add);
            else if (btn.id === "halfBet") modalBetInput.value = Math.max(10, Math.floor(currentVal / 2));
            else if (btn.id === "doubleBet") modalBetInput.value = currentVal * 2;
            else if (btn.id === "maxBet") modalBetInput.value = balance;
        });
    });

    confirmBetBtn.addEventListener("click", () => {
        let val = parseFloat(modalBetInput.value);
        if (val < 10) val = 10; // Min bet
        if (val > balance) val = balance;
        currentBet = val;
        displayBetValue.textContent = `$${formatChips(currentBet)}`;
        betModal.classList.remove("active");
        tableMessage.textContent = `Ready to bet $${formatChips(currentBet)}`;
    });

    function showPopup(msg) {
        popupMessage.textContent = msg;
        popupMessage.classList.add('show');
        setTimeout(() => popupMessage.classList.remove('show'), 2000);
    }

    // ================= GAME UI HELPERS =================
    function setControlsState(state) {
        if (state === 'IDLE') {
            btnDeal.style.display = 'flex';
            ingameControls.style.display = 'none';
            openBetModalBtn.style.opacity = '1';
            openBetModalBtn.style.pointerEvents = 'auto';
        } else if (state === 'PLAYING') {
            btnDeal.style.display = 'none';
            ingameControls.style.display = 'grid';
            openBetModalBtn.style.opacity = '0.5';
            openBetModalBtn.style.pointerEvents = 'none';
        }
    }

    function cardValue(card) {
        const val = card.rank || card.val;
        if (['J', 'Q', 'K'].includes(val)) return 10;
        if (val === 'A') return 11;
        return parseInt(val);
    }

    function calcScore(cards) {
        if (!Array.isArray(cards) || cards.length === 0) return 0;
        let score = cards.reduce((a, c) => a + cardValue(c), 0);
        let aces = cards.filter(c => (c.rank || c.val) === 'A').length;
        while (score > 21 && aces > 0) { score -= 10; aces--; }
        return score;
    }

    function getCardFilename(card) {
        const v = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }[card.rank || card.val] || (card.rank || card.val);
        const s = card.suit.toLowerCase();
        return `${v}_of_${s}.svg`;
    }

    function renderCard(card, container, hidden = false, delay = 0) {
        const div = document.createElement('div');
        div.classList.add('card');
        if (hidden) div.classList.add('hidden-card'); // Tag for JS lookup

        const inner = document.createElement('div');
        inner.classList.add('card-inner');
        div.appendChild(inner);

        const back = document.createElement('div');
        back.classList.add('card-back');
        inner.appendChild(back);

        const front = document.createElement('div');
        front.classList.add('card-front');
        if (!hidden) {
            const filename = getCardFilename(card);
            front.innerHTML = `<img src="/images/playing-cards/${filename}" alt="${card.rank}">`;
        }
        inner.appendChild(front);

        container.appendChild(div);

        if (!hidden) {
            setTimeout(() => div.classList.add('flipped'), delay);
        }
        return div;
    }

    function updateScores(hideDealer = true) {
        playerScoreEl.textContent = calcScore(playerCards);
        if (hideDealer) {
            // Assumes 2nd card is hidden
            const visible = dealerCards[0]; 
            dealerScoreEl.textContent = visible ? cardValue(visible) : 0;
        } else {
            dealerScoreEl.textContent = calcScore(dealerCards);
        }
    }

    // ================= GAME ACTIONS =================
    
    // --- DEAL ---
    btnDeal.addEventListener('click', async () => {
        if (currentBet > balance) return showPopup("Insufficient Balance");
        
        // Reset UI
        dealerHand.innerHTML = '';
        playerHand.innerHTML = '';
        tableMessage.textContent = 'Dealing...';
        setControlsState('PLAYING'); // Lock controls immediately
        
        // Disable buttons temporarily
        btnHit.disabled = true;
        btnStand.disabled = true;

        try {
            const res = await fetch(ENDPOINTS.start, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bet: currentBet })
            });
            const data = await res.json();
            if (res.status !== 200) throw new Error(data.message);

            // Update State
            playerCards = data.playerHand;
            dealerCards = data.dealerHand; // Hand[1] is hidden logic
            gameActive = true;
            balance = data.balance;
            balanceEl.textContent = formatChips(balance);
            tableMessage.textContent = ''; // Clear center text

            // Animations
            renderCard(playerCards[0], playerHand, false, 100);
            renderCard(dealerCards[0], dealerHand, false, 400);
            renderCard(playerCards[1], playerHand, false, 700);
            
            // Render Dealer Hidden Card
            const hiddenDiv = renderCard(dealerCards[1], dealerHand, true, 1000); 
            // Manually inject image into hidden card front for later reveal
            const front = hiddenDiv.querySelector('.card-front');
            front.innerHTML = `<img src="/images/playing-cards/${getCardFilename(dealerCards[1])}">`;

            setTimeout(() => {
                updateScores(true);
                if (data.result) {
                    // Immediate Blackjack/Loss
                    revealDealerAndEnd(data);
                } else {
                    btnHit.disabled = false;
                    btnStand.disabled = false;
                    tableMessage.textContent = "Hit or Stand?";
                }
            }, 1100);

        } catch (err) {
            console.error(err);
            showPopup("Connection Error");
            setControlsState('IDLE');
        }
    });

    // --- HIT ---
    btnHit.addEventListener('click', async () => {
        if (!gameActive) return;
        btnHit.disabled = true; 
        btnStand.disabled = true;

        try {
            const res = await fetch(ENDPOINTS.hit, { method: 'POST' });
            const data = await res.json();
            if (res.status !== 200) throw new Error(data.message);

            playerCards = data.playerHand;
            const newCard = playerCards[playerCards.length - 1];
            
            renderCard(newCard, playerHand, false, 50);
            updateScores(true);

            if (data.result) {
                // Bust or 21
                dealerCards = data.dealerHand; // Ensure we have dealer data
                revealDealerAndEnd(data);
            } else {
                btnHit.disabled = false;
                btnStand.disabled = false;
            }
        } catch (err) {
            showPopup("Error hitting");
        }
    });

    // --- STAND ---
    btnStand.addEventListener('click', async () => {
        if (!gameActive) return;
        btnHit.disabled = true;
        btnStand.disabled = true;
        tableMessage.textContent = "Dealer's turn...";

        try {
            const res = await fetch(ENDPOINTS.stand, { method: 'POST' });
            const data = await res.json();
            if (res.status !== 200) throw new Error(data.message);

            // 1. Reveal Hidden Card
            const hiddenCard = dealerHand.querySelector('.hidden-card');
            if (hiddenCard) {
                hiddenCard.classList.remove('hidden-card');
                hiddenCard.classList.add('flipped');
            }
            
            // 2. Play out dealer sequence
            dealerCards = data.dealerHand;
            
            // We already rendered the first 2 dealer cards. Start from index 2.
            const newCards = dealerCards.slice(2);
            
            const playSequence = async () => {
                // Update score for the first 2 cards first
                dealerScoreEl.textContent = calcScore(dealerCards.slice(0, 2));
                await new Promise(r => setTimeout(r, 600));

                for (let i = 0; i < newCards.length; i++) {
                    renderCard(newCards[i], dealerHand, false, 50);
                    // Update score progressively
                    dealerScoreEl.textContent = calcScore(dealerCards.slice(0, 2 + i + 1));
                    await new Promise(r => setTimeout(r, 800));
                }
                
                // Finalize
                gameActive = false;
                balance = data.balance;
                balanceEl.textContent = formatChips(balance);
                
                const win = data.result.toLowerCase().includes('win');
                const push = data.result.toLowerCase().includes('push');
                
                tableMessage.textContent = data.result;
                tableMessage.style.color = win ? '#00ff90' : (push ? '#ffd700' : '#ff4b4b');
                                
                setTimeout(() => setControlsState('IDLE'), 2000);
            };

            playSequence();

        } catch (err) {
            showPopup("Error standing");
        }
    });

    function revealDealerAndEnd(data) {
        // Reveal hidden card
        const hiddenCard = dealerHand.querySelector('.hidden-card');
        if (hiddenCard) {
            hiddenCard.classList.remove('hidden-card');
            hiddenCard.classList.add('flipped');
        }
        
        updateScores(false); // Show real dealer score
        
        balance = data.balance;
        balanceEl.textContent = formatChips(balance);
        gameActive = false;

        const win = data.result.toLowerCase().includes('win');
        const push = data.result.toLowerCase().includes('push');
        
        tableMessage.textContent = data.result;
        tableMessage.style.color = win ? '#00ff90' : (push ? '#ffd700' : '#ff4b4b');

        setTimeout(() => setControlsState('IDLE'), 2000);
    }

    // Initial dummy setup for looks
    renderCard({placeholder:true}, playerHand);
    renderCard({placeholder:true}, playerHand);
    renderCard({placeholder:true}, dealerHand);
    renderCard({placeholder:true}, dealerHand);
});