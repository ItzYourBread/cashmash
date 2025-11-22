document.addEventListener("DOMContentLoaded", () => {
    
    // ====================== UTILITY FUNCTION ======================
    const formatChips = (amount) => {
        if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
        const formatter = new Intl.NumberFormat('en-US', {
            notation: 'compact', compactDisplay: 'short',
            minimumFractionDigits: 1, maximumFractionDigits: 1,
        });
        return formatter.format(amount);
    };

    // ====================== DOM ELEMENTS ======================
    const grid = document.getElementById("grid");
    const multiplierDisplay = document.getElementById("multiplierDisplay");
    const profitDisplay = document.getElementById("profitDisplay");
    const balanceDisplay = document.getElementById("balance");
    const popupMessage = document.getElementById('popupMessage');
    
    // Controls
    const actionBtn = document.getElementById("actionBtn");
    const btnText = actionBtn.querySelector(".btn-text");
    const btnSubtext = document.getElementById("btnSubtext");

    // Triggers & Modals
    const openBetModalBtn = document.getElementById("openBetModalBtn");
    const openMinesModalBtn = document.getElementById("openMinesModalBtn");
    const betModal = document.getElementById("betModal");
    const minesModal = document.getElementById("minesModal");
    const displayBetValue = document.getElementById("displayBetValue");
    const displayMineCount = document.getElementById("displayMineCount");

    // Modal Inputs
    const modalBetInput = document.getElementById("modalBetInput");
    const confirmBetBtn = document.getElementById("confirmBet");
    const confirmMinesBtn = document.getElementById("confirmMines");
    const chipBtns = document.querySelectorAll(".chip-btn");
    const mineOptions = document.querySelectorAll(".mine-option");

    // --- Config & State ---
    const MINE_IMAGE = "images/Mines/bomb.png";
    const SAFE_IMAGE = "images/Mines/green-diamond.png";
    const UNREVEALED_TEXT = "❔";

    let gameId = null;
    let multiplier = 1;
    let bet = 1; // Default
    let mineCount = 3; // Default
    let gameActive = false;
    let tiles = [];
    let balance = parseFloat(balanceDisplay.dataset.rawBalance) || parseFloat(balanceDisplay.textContent) || 1000;

    // Initialize Display
    balanceDisplay.textContent = formatChips(balance);

    // ====================== MODAL LOGIC ======================
    
    // Open Modals
    openBetModalBtn.addEventListener("click", () => {
        if(gameActive) return showPopup("Cannot change bet during game");
        betModal.classList.add("active");
    });
    openMinesModalBtn.addEventListener("click", () => {
        if(gameActive) return showPopup("Cannot change mines during game");
        minesModal.classList.add("active");
    });

    // Close Modals
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.addEventListener("click", () => {
            betModal.classList.remove("active");
            minesModal.classList.remove("active");
        });
    });

    // Bet Modal Logic (Chips & Math)
    chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let currentVal = parseFloat(modalBetInput.value) || 0;
            if (btn.dataset.add) {
                modalBetInput.value = currentVal + parseFloat(btn.dataset.add);
            } else if (btn.id === "halfBet") {
                modalBetInput.value = Math.max(1, Math.floor(currentVal / 2));
            } else if (btn.id === "doubleBet") {
                modalBetInput.value = currentVal * 2;
            } else if (btn.id === "maxBet") {
                modalBetInput.value = balance;
            }
        });
    });

    // Confirm Bet
    confirmBetBtn.addEventListener("click", () => {
        let val = parseFloat(modalBetInput.value);
        if (val < 1) val = 1;
        if (val > balance) val = balance; // Cap at balance
        bet = val;
        displayBetValue.textContent = bet;
        betModal.classList.remove("active");
    });

    // Mine Modal Logic
    mineOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            mineOptions.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
        });
    });

    // Confirm Mines
    confirmMinesBtn.addEventListener("click", () => {
        const activeOpt = document.querySelector(".mine-option.active");
        if (activeOpt) {
            mineCount = parseInt(activeOpt.dataset.val);
            displayMineCount.textContent = mineCount;
        }
        minesModal.classList.remove("active");
    });

    // ====================== GAME LOGIC ======================

    function showPopup(message, duration = 2000) {
        popupMessage.textContent = message;
        popupMessage.classList.add('show');
        setTimeout(() => popupMessage.classList.remove('show'), duration);
    }

    function updateBalanceDisplay() {
        balanceDisplay.textContent = formatChips(balance);
    }

    function setTileImage(tile, src) {
        tile.innerHTML = `<img src="${src}" alt="icon" style="width: 70%; height: 70%; object-fit: contain; animation: popIn 0.3s;">`;
    }

    function setActionState(state, profitAmount = 0) {
        // Reset classes
        actionBtn.classList.remove("start", "cashout");
        actionBtn.disabled = false;

        if (state === "START") {
            actionBtn.classList.add("start");
            btnText.textContent = "Start Game";
            btnSubtext.textContent = `Bet: $${bet}`;
        } else if (state === "CASHOUT") {
            actionBtn.classList.add("cashout");
            btnText.textContent = "Cash Out";
            btnSubtext.textContent = `Win: $${formatChips(profitAmount)}`;
        } else if (state === "LOADING") {
            actionBtn.classList.add("start");
            actionBtn.disabled = true;
            btnText.textContent = "Processing...";
            btnSubtext.textContent = "";
        } else if (state === "FINISHED") {
            actionBtn.classList.add("start");
            btnText.textContent = "Next Game";
            btnSubtext.textContent = "Press to play again";
        }
    }

    // Initial State
    buildLockedGrid();

    function buildLockedGrid() {
        grid.innerHTML = "";
        grid.classList.add("locked");
        for (let i = 0; i < 25; i++) {
            const tile = document.createElement("div");
            tile.classList.add("tile");
            grid.appendChild(tile);
        }
        setActionState("START");
    }

    // ⚡ START GAME
    actionBtn.addEventListener("click", async () => {
        if (gameActive) {
            // If game active, this button acts as Cashout
            await cashOut();
        } else {
            // If game not active, Start
            await startGame();
        }
    });

    async function startGame() {
        if (bet > balance) return showPopup("Insufficient Balance!");
        
        setActionState("LOADING");

        try {
            // Simulated Server Call (Replace with real fetch)
            const res = await fetch("/mines/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bet, mineCount }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            // Update State
            balance -= bet;
            updateBalanceDisplay();
            gameId = data.gameId;
            multiplier = 1;
            gameActive = true;
            tiles = [];
            
            // UI Reset
            multiplierDisplay.textContent = "1.00x";
            profitDisplay.textContent = formatChips(0);
            grid.classList.remove("locked");
            grid.innerHTML = "";

            // Build Playable Grid
            for (let i = 0; i < data.gridSize; i++) {
                const tile = document.createElement("div");
                tile.classList.add("tile");
                //tile.textContent = UNREVEALED_TEXT; // Optional: keep clean or add question mark
                tile.addEventListener("click", () => revealTile(i, tile));
                grid.appendChild(tile);
                tiles.push(tile);
            }

            // Switch Button to Cashout Mode
            setActionState("CASHOUT", bet); // Initially cashout value is just bet (or 0 depending on rules, usually can't cashout instantly without 1 move)

        } catch (err) {
            console.error(err);
            showPopup(err.message || "Error starting game");
            setActionState("START");
        }
    }

    async function revealTile(index, tile) {
        if (!gameActive || tile.classList.contains("safe") || tile.classList.contains("mine")) return;

        try {
            const res = await fetch("/mines/reveal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId, index }),
            });
            const data = await res.json();

            if (!data.ok) {
                if (data.hitMine) {
                    // BOOM
                    tile.classList.add("mine");
                    setTileImage(tile, MINE_IMAGE);
                    revealAllMines(data.mines);
                    gameOver(false);
                } else {
                    showPopup(data.error);
                }
                return;
            }

            // SAFE
            tile.classList.add("safe");
            setTileImage(tile, SAFE_IMAGE);
            multiplier = data.multiplier;
            
            const currentProfit = bet * multiplier;
            multiplierDisplay.textContent = `${multiplier.toFixed(2)}x`;
            profitDisplay.textContent = formatChips(currentProfit);
            
            // Update Cashout Button Text
            setActionState("CASHOUT", currentProfit);

        } catch (err) {
            console.error(err);
        }
    }

    async function cashOut() {
        try {
            const res = await fetch("/mines/cashout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (!data.ok) throw new Error(data.error);

            balance += data.winnings;
            updateBalanceDisplay();
            showPopup(`Cashed Out: $${formatChips(data.winnings)}`);
            gameOver(true);

        } catch (err) {
            console.error(err);
            showPopup("Error cashing out");
        }
    }

    function gameOver(win) {
        gameActive = false;
        grid.classList.add("locked");
        setActionState("FINISHED");
        if (win) {
            profitDisplay.classList.add("pulse-green"); // Add animation class in CSS if desired
        }
    }

    function revealAllMines(mines) {
        mines.forEach(i => {
            if (tiles[i] && !tiles[i].classList.contains("safe")) {
                tiles[i].classList.add("mine");
                setTileImage(tiles[i], MINE_IMAGE);
            }
        });
        showPopup("BOOM! Game Over");
    }
});