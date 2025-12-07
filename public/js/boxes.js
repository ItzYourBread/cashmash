document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITIES ---
    const formatChips = (amount) => {
        if (amount === null || amount === undefined) return '0.00';
        const num = Number(amount);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const showPopup = (message, duration = 2000) => {
        const el = document.getElementById('popupMessage');
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), duration);
    };

    // --- DOM ELEMENTS ---
    const pyramid = document.getElementById('pyramid');
    const multiplierDisplay = document.getElementById('multiplierDisplay');
    const profitDisplay = document.getElementById('profitDisplay');
    const balanceDisplay = document.getElementById('balance');
    const actionBtn = document.getElementById('actionBtn');
    const btnText = actionBtn.querySelector('.btn-text');
    const btnSubtext = document.getElementById('btnSubtext');

    // Modals
    const openBetModalBtn = document.getElementById('openBetModalBtn');
    const openTrapModalBtn = document.getElementById('openTrapModalBtn');
    const betModal = document.getElementById('betModal');
    const trapModal = document.getElementById('trapModal');
    const modalBetInput = document.getElementById('modalBetInput');
    const confirmBetBtn = document.getElementById('confirmBet');
    const confirmTrapsBtn = document.getElementById('confirmTraps');
    const displayBetValue = document.getElementById('displayBetValue');
    const displayTrapCount = document.getElementById('displayTrapCount');
    const trapOptions = document.querySelectorAll('.trap-option');
    const chipBtns = document.querySelectorAll('.chip-btn');

    // --- CONFIG ---
    const BOX_IMAGE_SAFE = '/images/Mines/green-diamond.png';
    const BOX_IMAGE_TRAP = '/images/Mines/bomb.png';
    const GRID_ROWS = [2, 3, 4, 5, 6, 7, 8, 9];

    // --- STATE ---
    let gameActive = false;
    let gameId = null;
    let bet = 1.00;
    let trapCount = 3;
    let balance = parseFloat(balanceDisplay.dataset.rawBalance) || parseFloat(balanceDisplay.textContent) || 1000;
    let currentRowIndex = -1;

    // --- BETTING LIMITS ---
    const MIN_BET = 1;
    const MAX_BET = 100;

    // --- INITIAL SETUP ---
    balanceDisplay.textContent = formatChips(balance);

    // --- BETTING LOGIC ---
    function clampBet(val) {
        val = parseFloat(val);
        if (isNaN(val)) val = MIN_BET;
        const maxLimit = Math.min(MAX_BET, balance);
        return Math.min(Math.max(val, MIN_BET), maxLimit);
    }

    chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let currentVal = parseFloat(modalBetInput.value) || 0;
            if (btn.dataset.add) currentVal += parseFloat(btn.dataset.add);
            else if (btn.id === "halfBet") currentVal = Math.floor(currentVal / 2);
            else if (btn.id === "doubleBet") currentVal *= 2;
            else if (btn.id === "maxBet") currentVal = balance;
            const safeVal = clampBet(currentVal);
            modalBetInput.value = safeVal % 1 === 0 ? safeVal : safeVal.toFixed(2);
        });
    });

    confirmBetBtn.addEventListener("click", () => {
        bet = clampBet(modalBetInput.value);
        displayBetValue.textContent = "$" + bet.toFixed(2);
        btnSubtext.textContent = `Bet: $${bet.toFixed(2)}`;
        betModal.classList.remove("active");
    });

    openBetModalBtn.onclick = () => { modalBetInput.value = bet; betModal.classList.add('active'); };
    openTrapModalBtn.onclick = () => { if (gameActive) return showPopup('Cannot change traps while playing'); trapModal.classList.add('active'); };
    document.querySelectorAll(".close-modal").forEach(btn => { btn.addEventListener("click", () => { betModal.classList.remove("active"); trapModal.classList.remove("active"); }); });
    trapOptions.forEach(opt => { opt.addEventListener('click', () => { trapOptions.forEach(o => o.classList.remove('active')); opt.classList.add('active'); }); });
    confirmTrapsBtn.addEventListener('click', () => { const active = document.querySelector('.trap-option.active'); if (active) { trapCount = parseInt(active.dataset.val); displayTrapCount.textContent = trapCount; } trapModal.classList.remove('active'); });

    // --- GAME FUNCTIONS ---

    const buildLockedGrid = () => {
        pyramid.innerHTML = '';
        pyramid.classList.add('locked');
        GRID_ROWS.forEach(count => {
            const row = document.createElement('div');
            row.classList.add('pyramid-row');
            for (let i = 0; i < count; i++) { const box = document.createElement('div'); box.classList.add('box-tile'); row.appendChild(box); }
            pyramid.appendChild(row);
        });
        setActionState('START');
    };

    const startGame = async () => {
        if (bet > balance) return showPopup('Insufficient Balance');
        setActionState('LOADING');
        try {
            const res = await fetch('/boxes/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bet, trapCount }) });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error || 'Failed to start');
            gameId = data.gameId; balance = data.balance; balanceDisplay.textContent = formatChips(balance); gameActive = true; currentRowIndex = data.currentRowIndex;
            multiplierDisplay.textContent = '1.00x'; profitDisplay.textContent = formatChips(0); profitDisplay.classList.remove('pulse-green');
            buildPlayableGrid(currentRowIndex); setActionState('CASHOUT', bet);
        } catch (err) { console.error(err); showPopup(err.message); setActionState('START'); }
    };

    const buildPlayableGrid = (activeRowIdx) => {
        pyramid.innerHTML = ''; pyramid.classList.remove('locked');
        GRID_ROWS.forEach((boxCount, rIndex) => {
            const row = document.createElement('div'); row.classList.add('pyramid-row'); row.id = `row-${rIndex}`;
            if (rIndex === activeRowIdx) row.classList.add('active-row'); else if (rIndex > activeRowIdx) row.classList.add('completed-row'); else row.classList.add('inactive-row');
            for (let i = 0; i < boxCount; i++) {
                const tile = document.createElement('div'); tile.classList.add('box-tile'); tile.dataset.row = rIndex; tile.dataset.col = i;
                tile.addEventListener('click', () => handleBoxClick(rIndex, i, tile)); row.appendChild(tile);
            }
            pyramid.appendChild(row);
        });
    };

    const handleBoxClick = async (rIndex, cIndex, tile) => {
        if (!gameActive) return;
        if (rIndex !== currentRowIndex) return;
        if (tile.classList.contains('revealed')) return;

        try {
            const res = await fetch('/boxes/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, rowIndex: rIndex, colIndex: cIndex })
            });
            const data = await res.json();

            if (!data.ok) {
                if (data.gameOver) {
                    // HIT TRAP - Reveal everything as Game Over
                    tile.classList.add('trap', 'revealed');
                    tile.innerHTML = `<img src="${BOX_IMAGE_TRAP}" class="box-content">`;
                    if (data.allMines) revealRowContents(rIndex, data.allMines);
                    handleGameOver(false);
                } else {
                    showPopup(data.error || 'Error');
                }
                return;
            }

            // SAFE HIT
            tile.classList.add('safe', 'revealed');
            tile.innerHTML = `<img src="${BOX_IMAGE_SAFE}" class="box-content">`;

            // NEW: Reveal the rest of the row visually
            if (data.rowMines) {
                revealRowContents(rIndex, data.rowMines);
            }

            multiplierDisplay.textContent = `${data.multiplier.toFixed(2)}x`;
            const currentProfit = bet * data.multiplier;
            profitDisplay.textContent = formatChips(currentProfit);

            if (data.isWin) {
                showPopup(`Victory! Won $${formatChips(data.winnings)}`);
                balance = data.balance;
                balanceDisplay.textContent = formatChips(balance);
                handleGameOver(true);
            } else {
                advanceRow(rIndex, data.nextRowIndex);
                setActionState('CASHOUT', currentProfit);
            }

        } catch (err) {
            console.error(err);
        }
    };

    const cashOut = async () => {
        if (!gameActive) return;
        setActionState('LOADING');
        try {
            const res = await fetch('/boxes/cashout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId }) });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);
            balance = data.balance; balanceDisplay.textContent = formatChips(balance); showPopup(`Cashed Out: $${formatChips(data.winnings)}`); handleGameOver(true);
        } catch (err) { console.error(err); showPopup(err.message); setActionState('CASHOUT', 0); }
    };

    const advanceRow = (oldIndex, newIndex) => {
        const oldRow = document.getElementById(`row-${oldIndex}`);
        if (oldRow) {
            oldRow.classList.remove('active-row');
            oldRow.classList.add('completed-row');
            // Opacity change handled by revealRowContents now
        }
        const newRow = document.getElementById(`row-${newIndex}`);
        if (newRow) {
            newRow.classList.remove('inactive-row');
            newRow.classList.add('active-row');
            currentRowIndex = newIndex;
        }
    };

    // NEW HELPER: Reveals everything on a row (Safe and Trap)
    // that hasn't been clicked yet.
    const revealRowContents = (rowIndex, mineIndices) => {
        const row = document.getElementById(`row-${rowIndex}`);
        if (!row) return;

        Array.from(row.children).forEach((tile, colIdx) => {
            // Skip if the user just clicked it (it's already 'revealed' by main logic)
            if (tile.classList.contains('revealed')) return;

            tile.classList.add('revealed');
            // Make unchosen tiles dimmer so the chosen one stands out
            tile.style.opacity = '0.5';

            if (mineIndices.includes(colIdx)) {
                // It's a trap the user missed
                tile.classList.add('trap');
                tile.innerHTML = `<img src="${BOX_IMAGE_TRAP}" class="box-content">`;
            } else {
                // It's a safe spot the user didn't click
                tile.classList.add('safe');
                tile.innerHTML = `<img src="${BOX_IMAGE_SAFE}" class="box-content">`;
            }
        });
    };

    const handleGameOver = (win) => {
        gameActive = false; gameId = null;
        const rows = document.querySelectorAll('.pyramid-row');
        rows.forEach(r => { r.classList.remove('active-row'); r.classList.add('inactive-row'); });
        pyramid.classList.add('locked'); setActionState('FINISHED'); if (win) profitDisplay.classList.add('pulse-green');
    };

    const setActionState = (state, amount = 0) => {
        actionBtn.classList.remove('start', 'cashout'); actionBtn.disabled = false;
        if (state === 'START') { actionBtn.classList.add('start'); btnText.textContent = 'Start Game'; btnSubtext.textContent = `Bet: $${bet.toFixed(2)}`; actionBtn.onclick = startGame; }
        else if (state === 'CASHOUT') { actionBtn.classList.add('cashout'); btnText.textContent = 'Cash Out'; btnSubtext.textContent = `Win: $${formatChips(amount)}`; actionBtn.onclick = cashOut; }
        else if (state === 'LOADING') { actionBtn.classList.add('start'); actionBtn.disabled = true; btnText.textContent = 'Processing...'; btnSubtext.textContent = ''; }
        else if (state === 'FINISHED') { actionBtn.classList.add('start'); btnText.textContent = 'Play Again'; btnSubtext.textContent = 'Press to restart'; actionBtn.onclick = startGame; }
    };

    buildLockedGrid();
});