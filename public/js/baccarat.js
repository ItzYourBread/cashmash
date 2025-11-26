document.addEventListener("DOMContentLoaded", () => {

    // ================= DOM ELEMENTS =================
    // Game Areas
    const playerHand = document.getElementById('playerHand');
    const bankerHand = document.getElementById('bankerHand');
    const playerScoreEl = document.getElementById('playerScoreDisplay');
    const bankerScoreEl = document.getElementById('bankerScoreDisplay');
    const balanceEl = document.getElementById('balance');
    const popupMessage = document.getElementById('popupMessage');

    // Message Element (Restored)
    const resultText = document.getElementById('resultText');

    // Controls
    const btnDeal = document.getElementById('btnDeal');
    const totalBetDisplay = document.getElementById('totalBetDisplay');
    const openBetModalBtn = document.getElementById('openBetModalBtn');

    // Trigger Display Tags
    const displayBetP = document.getElementById('displayBetP');
    const displayBetB = document.getElementById('displayBetB');
    const displayBetT = document.getElementById('displayBetT');

    // Modal
    const betModal = document.getElementById('betModal');
    const inputPlayer = document.getElementById('inputPlayer');
    const inputBanker = document.getElementById('inputBanker');
    const inputTie = document.getElementById('inputTie');
    const modalTotal = document.getElementById('modalTotal');
    const confirmBetBtn = document.getElementById('confirmBet');
    const clearBetsBtn = document.getElementById('clearBets');
    const chipBtns = document.querySelectorAll('.chip-btn');
    const closeModalBtns = document.querySelectorAll('.close-modal');

    // ================= STATE =================
    let balance = parseFloat(balanceEl.dataset.rawBalance) || 0;
    let bets = { player: 0, banker: 0, tie: 0 };
    let totalBet = 0;
    let lastActiveInput = inputPlayer; // Default target for chips
    const MIN_BET = 0;
    const MAX_BET = 100;


    // ================= UTILS =================
    const formatChips = (amount) => {
        if (amount === null || amount === undefined) return '0.00';

        const num = Number(amount);
        if (isNaN(num)) return '0.00';

        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };


    const showPopup = (msg) => {
        popupMessage.textContent = msg;
        popupMessage.classList.add('show');
        setTimeout(() => popupMessage.classList.remove('show'), 2000);
    };

    const getCardFilename = (card) => {
        const v = { J: 'jack', Q: 'queen', K: 'king', A: 'ace' }[card.rank] || card.rank;
        const s = card.suit ? card.suit.toLowerCase() : 'spades';
        return `${v}_of_${s}.svg`;
    };

    // ================= MESSAGE DISPLAY LOGIC (Restored) =================

    // Helper to set message and optional winner class for color
    const setMessage = (message, winner = 'none') => {
        resultText.textContent = message;
        resultText.classList.remove('win-player', 'win-banker', 'tie-game');
        if (winner === 'player') {
            resultText.classList.add('win-player');
        } else if (winner === 'banker') {
            resultText.classList.add('win-banker');
        } else if (winner === 'tie') {
            resultText.classList.add('tie-game');
        } else {
            // Default color (gold)
        }
    };

    // ================= BETTING MODAL LOGIC =================

    // Track which input was last focused to apply chips there
    [inputPlayer, inputBanker, inputTie].forEach(input => {
        input.addEventListener('blur', () => {
            let val = parseFloat(input.value) || 0;
            val = Math.min(Math.max(val, MIN_BET), MAX_BET);
            input.value = val;
            calculateModalTotal();
        });
    });


    openBetModalBtn.addEventListener('click', () => {
        // Sync modal with current bets
        inputPlayer.value = bets.player;
        inputBanker.value = bets.banker;
        inputTie.value = bets.tie;
        calculateModalTotal();
        betModal.classList.add('active');
    });

    closeModalBtns.forEach(btn => btn.addEventListener('click', () => betModal.classList.remove('active')));

    // --- Bet Modal Logic (Chips & Math) ---
    chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let currentVal = parseFloat(modalBetInput.value) || 0;
            if (btn.dataset.add) {
                currentVal += parseFloat(btn.dataset.add);
            } else if (btn.id === "halfBet") {
                currentVal = Math.floor(currentVal / 2);
            } else if (btn.id === "doubleBet") {
                currentVal *= 2;
            } else if (btn.id === "maxBet") {
                currentVal = balance;
            }

            // Enforce min/max
            currentVal = Math.min(Math.max(currentVal, MIN_BET), Math.min(MAX_BET, balance));
            modalBetInput.value = currentVal;
        });
    });


    function calculateModalTotal() {
        const p = parseFloat(inputPlayer.value) || 0;
        const b = parseFloat(inputBanker.value) || 0;
        const t = parseFloat(inputTie.value) || 0;
        const sum = p + b + t;

        modalTotal.textContent = `$${formatChips(sum)}`;
        if (sum > balance) modalTotal.style.color = '#ff4b4b'; // Danger red
        else modalTotal.style.color = '#fff';
    }

    confirmBetBtn.addEventListener('click', () => {
        const p = parseFloat(inputPlayer.value) || 0;
        const b = parseFloat(inputBanker.value) || 0;
        const t = parseFloat(inputTie.value) || 0;
        const sum = p + b + t;

        if (sum > balance) return showPopup("Insufficient Balance");

        bets = { player: p, banker: b, tie: t };
        totalBet = sum;

        // Update Dock Display
        displayBetP.textContent = `P: $${formatChips(p)}`;
        displayBetB.textContent = `B: $${formatChips(b)}`;
        displayBetT.textContent = `T: $${formatChips(t)}`;
        totalBetDisplay.textContent = `Total Bet: $${formatChips(sum)}`;

        // Dim zero bets
        displayBetP.style.opacity = p > 0 ? 1 : 0.3;
        displayBetB.style.opacity = b > 0 ? 1 : 0.3;
        displayBetT.style.opacity = t > 0 ? 1 : 0.3;

        betModal.classList.remove('active');
        if (sum > 0) setMessage(`Ready to Deal. Total Bet: $${formatChips(sum)}`);
    });


    // ================= GAME LOGIC =================

    function renderCard(card, container, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                const div = document.createElement('div');
                div.classList.add('card');

                const inner = document.createElement('div');
                inner.classList.add('card-inner');
                div.appendChild(inner);

                const back = document.createElement('div');
                back.classList.add('card-back');
                inner.appendChild(back);

                const front = document.createElement('div');
                front.classList.add('card-front');
                if (card) {
                    const fname = getCardFilename(card);
                    front.innerHTML = `<img src="/images/playing-cards/${fname}" alt="${card.rank}">`;
                }
                inner.appendChild(front);

                container.appendChild(div);

                // Trigger Flip
                requestAnimationFrame(() => div.classList.add('flipped'));

                resolve();
            }, delay);
        });
    }

    btnDeal.addEventListener('click', async () => {
        if (totalBet <= 0) return showPopup("Place a bet first!");
        if (totalBet > balance) return showPopup("Insufficient Balance");

        // UI Reset
        playerHand.innerHTML = '';
        bankerHand.innerHTML = '';
        playerScoreEl.textContent = '0';
        bankerScoreEl.textContent = '0';
        btnDeal.disabled = true;
        setMessage('Dealing cards...');

        try {
            // Optimistic Balance Update
            balance -= totalBet;
            balanceEl.textContent = formatChips(balance);

            const res = await fetch("/baccarat/play", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    betPlayer: bets.player,
                    betBanker: bets.banker,
                    betTie: bets.tie
                }),
            });
            const data = await res.json();

            if (!data.success) throw new Error(data.message);

            // Animation Sequence
            let delay = 0;
            const step = 200;

            await renderCard(data.player.cards[0], playerHand, delay += step);
            await renderCard(data.banker.cards[0], bankerHand, delay += step);
            await renderCard(data.player.cards[1], playerHand, delay += step);
            await renderCard(data.banker.cards[1], bankerHand, delay += step);

            // 3rd Card Rules
            if (data.player.cards[2]) {
                await renderCard(data.player.cards[2], playerHand, delay += step);
            }
            if (data.banker.cards[2]) {
                await renderCard(data.banker.cards[2], bankerHand, delay += step);
            }

            setTimeout(() => {
                // Show Scores
                playerScoreEl.textContent = data.player.points;
                bankerScoreEl.textContent = data.banker.points;

                // Finalize
                balance = data.balance;
                balanceEl.textContent = formatChips(balance);

                let winAmt = data.profit;
                let finalMessage = "";
                let winnerClass = "none";

                if (data.result === 'player') {
                    winnerClass = 'player';
                    finalMessage = `PLAYER WINS! | Profit: $${formatChips(winAmt)}`;
                } else if (data.result === 'banker') {
                    winnerClass = 'banker';
                    finalMessage = `BANKER WINS! | Profit: $${formatChips(winAmt)}`;
                } else {
                    winnerClass = 'tie';
                    finalMessage = `TIE GAME! | Profit: $${formatChips(winAmt)}`;
                }

                if (winAmt <= 0 && data.result !== 'tie') { // If no profit, show loss/return message
                    finalMessage = `${finalMessage.split(' | ')[0]} | Lost: $${formatChips(totalBet)}`;
                }

                setMessage(finalMessage, winnerClass);
                btnDeal.disabled = false;

            }, delay + 300);

        } catch (err) {
            console.error(err);
            showPopup("Error: " + err.message);
            balance += totalBet; // Refund on crash
            balanceEl.textContent = formatChips(balance);
            btnDeal.disabled = false;
            setMessage('Place your bets and deal.');
        }
    });

    // Init
    balanceEl.textContent = formatChips(balance);
});