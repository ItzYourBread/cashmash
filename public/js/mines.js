document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("grid");
    const betInput = document.getElementById("betInput");
    const mineRate = document.getElementById("mineRate");
    const multiplierDisplay = document.getElementById("multiplierDisplay");
    const profitDisplay = document.getElementById("profitDisplay");
    const cashOutBtn = document.getElementById("cashOutBtn");
    const newGameBtn = document.getElementById("newGameBtn");
    const balanceDisplay = document.getElementById("balance");
    const popupMessage = document.getElementById('popupMessage');

    // --- Image paths ---
    const MINE_IMAGE = "images/Mines/bomb.png";
    const SAFE_IMAGE = "images/Mines/green-diamond.png";
    const UNREVEALED_TEXT = "❔"; // Keeping text for unrevealed, as no image was provided for it.
    // -------------------

    function showPopup(message, duration = 1500) {
        popupMessage.textContent = message;
        popupMessage.classList.add('show');
        setTimeout(() => popupMessage.classList.remove('show'), duration);
    }

    let gameId = null;
    let multiplier = 1;
    let bet = 1;
    let mineCount = 3;
    let gameActive = false;
    let tiles = [];
    let balance = parseFloat(balanceDisplay.textContent) || 0;

    // 🧱 Build locked grid initially
    function buildLockedGrid() {
        grid.innerHTML = "";
        grid.classList.add("locked");
        for (let i = 0; i < 25; i++) {
            const tile = document.createElement("div");
            tile.classList.add("tile", "disabled");
            tile.textContent = UNREVEALED_TEXT;
            grid.appendChild(tile);
        }
    }
    buildLockedGrid();

    // ⚡ Update balance display smoothly
    function updateBalanceDisplay() {
        balanceDisplay.textContent = balance.toFixed(2);
    }

    // Function to set the content of a tile to an image
    function setTileImage(tile, src) {
        tile.innerHTML = `<img src="${src}" alt="Tile Content" style="width: 80%; height: 80%; object-fit: contain;">`;
    }

    // 🎮 Start Game
    async function startGame() {
        if (gameActive) return alert("Finish or cash out current game first!");

        bet = parseFloat(betInput.value);
        mineCount = parseInt(mineRate.value);
        if (isNaN(bet) || bet < 1) return alert("Invalid bet amount");
        if (mineCount < 1 || mineCount > 24) return alert("Invalid mine count");
        if (bet > balance) return alert("Not enough balance!");

        try {
            const res = await fetch("/mines/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bet, mineCount }),
            });
            const data = await res.json();
            if (!data.ok) return alert(data.error);

            // 💰 Deduct bet instantly
            balance -= bet;
            updateBalanceDisplay();

            showPopup("Game Started!");

            // ✅ Reset state
            gameId = data.gameId;
            multiplier = 1;
            gameActive = true;
            tiles = [];
            multiplierDisplay.textContent = "1.00x";
            profitDisplay.textContent = "0";
            cashOutBtn.disabled = false;
            newGameBtn.textContent = "In Progress...";
            newGameBtn.disabled = true;

            // Unlock grid
            grid.classList.remove("locked");
            grid.innerHTML = "";
            for (let i = 0; i < data.gridSize; i++) {
                const tile = document.createElement("div");
                tile.classList.add("tile");
                tile.textContent = UNREVEALED_TEXT; // Initial unrevealed look
                tile.addEventListener("click", () => revealTile(i, tile));
                grid.appendChild(tile);
                tiles.push(tile);
            }
        } catch (err) {
            console.error("Start game error:", err);
            alert("Server error while starting game");
        }
    }

    // 💎 Reveal Tile
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
                    // 💣 Hit mine - USE BOMB IMAGE
                    tile.classList.add("mine");
                    setTileImage(tile, MINE_IMAGE);
                    revealAllMines(data.mines);
                    gameActive = false;
                    cashOutBtn.disabled = true;
                    newGameBtn.textContent = "Next Game";
                    newGameBtn.disabled = false;
                    grid.classList.add("locked");
                    showPopup("Boom! You hit a mine!");
                    updateBalanceDisplay();
                } else {
                    alert(data.error);
                }
                return;
            }

            // Safe click - USE SAFE IMAGE (green diamond)
            tile.classList.add("safe");
            setTileImage(tile, SAFE_IMAGE);
            multiplier = data.multiplier;
            updateStats();
        } catch (err) {
            console.error("Reveal error:", err);
            alert("Server error while revealing");
        }
    }

    // 📊 Update Stats
    function updateStats() {
        const profit = (bet * multiplier).toFixed(2);
        multiplierDisplay.textContent = `${multiplier.toFixed(2)}x`;
        profitDisplay.textContent = profit;
    }

    // 💣 Reveal all mines
    function revealAllMines(mines) {
        mines.forEach(i => {
            if (tiles[i].classList.contains("safe")) return;
            tiles[i].classList.add("mine");
            // Set image for all unrevealed mines
            setTileImage(tiles[i], MINE_IMAGE);
        });
    }

    // 💰 Cash Out
    async function cashOut() {
        if (!gameActive) return;

        try {
            const res = await fetch("/mines/cashout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameId }),
            });
            const data = await res.json();
            if (!data.ok) return alert(data.error);

            // ✅ Add winnings to balance
            balance += data.winnings;
            updateBalanceDisplay();

            showPopup(`You Cashed Out ${data.winnings} chips!!`);
            gameActive = false;
            cashOutBtn.disabled = true;
            newGameBtn.textContent = "Next Game";
            newGameBtn.disabled = false;
            grid.classList.add("locked");
        } catch (err) {
            console.error("Cashout error:", err);
            alert("Server error during cashout");
        }
    }

    // 🖱️ Event Listeners
    cashOutBtn.addEventListener("click", cashOut);
    newGameBtn.addEventListener("click", startGame);
});