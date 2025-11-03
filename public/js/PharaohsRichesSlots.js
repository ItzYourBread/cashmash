document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('slotCanvas');
    const ctx = canvas.getContext('2d');

    const spinBtn = document.getElementById('spinBtn');
    const balanceDisplay = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const resultDisplay = document.getElementById('result');

    // ====================== UTILITY FUNCTION (K/M FORMAT) ======================
    /**
     * Formats the chip amount for display using K (thousands) or M (millions) notation.
     * If the number is less than 1000, it defaults to two decimal places.
     * @param {number} amount - The raw chip amount.
     * @returns {string} The formatted compact string (e.g., 12345 -> 12.3K).
     */
    const formatChips = (amount) => {
        // If the number is small, just use standard fixed decimal format
        if (Math.abs(amount) < 1000) {
            return parseFloat(amount).toFixed(2);
        }
        
        // Use Intl.NumberFormat for compact notation (K, M, etc.)
        const formatter = new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short', 
            minimumFractionDigits: 1, 
            maximumFractionDigits: 1,
        });

        return formatter.format(amount);
    };
    // ===========================================================================


    betInput.addEventListener("blur", () => {
        let val = parseInt(betInput.value);
        if (isNaN(val) || val < 50) betInput.value = 50;
        if (val > 1000) betInput.value = 1000;
    });

    // ====================== CONFIG ======================
    const REELS = 5;
    const ROWS = 4;
    const SYMBOL_SIZE = 100;
    const GAP = 8;

    const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP; // Corrected the calculation to use GAP not 8
    const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP; // Corrected the calculation to use GAP not 8

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Read the raw number from the data attribute for calculations.
    // The radix for parseInt should be 10, not 50.
    let currentBalance = parseFloat(balanceDisplay.dataset.rawChips) || parseFloat(balanceDisplay.textContent) || 0;

    // Set initial balance display using the new K/M formatter
    balanceDisplay.textContent = formatChips(currentBalance); 

    // ====================== SYMBOLS ======================
    const symbols = [
        { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png' },
        { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png' },
        { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png' },
        { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png' },
        { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png' },
        { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png' },
        { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png' },
        { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png' },
        { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png' }
    ];

    // Preload images
    const loadedSymbols = [];
    let loadedCount = 0;
    symbols.forEach(s => {
        const img = new Image();
        img.src = s.file;
        img.onload = () => {
            loadedCount++;
            if (loadedCount === symbols.length) init();
        };
        loadedSymbols.push({ img, file: s.file });
    });

    // ====================== SERVER COMMUNICATION ======================
    const actualServerSpin = async (bet) => {
        const response = await fetch('/slots/spin?type=PharaohsRiches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet, slotType: 'PharaohsRiches' })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || 'Server request failed');
        }
        return data;
    };

    // ====================== REEL CLASS ======================
    class Reel {
        constructor(x, index) {
            this.x = x;
            this.index = index;
            this.position = 0;
            this.speed = 0;
            this.target = null;
            this.stopping = false;
            this.settled = false;
            this.blur = 0;
        }

        start() {
            this.speed = 40 + Math.random() * 20;
            this.stopping = false;
            this.settled = false;
            this.blur = 0;
        }

        stop(finalSymbols) {
            this.target = finalSymbols;
            this.stopping = true;
        }

        update() {
            if (!spinning) return;

            this.position += this.speed;

            if (this.position >= SYMBOL_SIZE + GAP) {
                this.position -= SYMBOL_SIZE + GAP;
            }

            if (this.stopping && !this.settled) {
                this.speed *= 0.95;
                if (this.speed < 1) {
                    this.speed = 0;
                    this.settled = true;
                    this.position = 0;
                }
            }

            this.blur = Math.min(this.speed / 10, 3);
        }

        draw() {
            const yOffset = -this.position;

            for (let i = 0; i < ROWS + 2; i++) {
                let imgData;
                let isWinningSymbol = false;

                if (this.settled && this.target) {
                    const idx = i % ROWS;
                    const symbolData = this.target[idx];

                    const match = loadedSymbols.find(s => s.file === symbolData.file);
                    imgData = match ? match.img : loadedSymbols[0].img;

                    if (symbolData.win) isWinningSymbol = true;
                } else {
                    imgData = loadedSymbols[Math.floor(Math.random() * loadedSymbols.length)].img;
                }

                const y = yOffset + i * (SYMBOL_SIZE + GAP);

                ctx.save();

                // --- BRIGHT LINE BORDER ---
                if (isWinningSymbol && glowing) {
                    ctx.strokeStyle = 'gold'; // Using gold for Pharaoh theme
                    ctx.lineWidth = 4;        
                    ctx.lineJoin = 'round';

                    ctx.strokeRect(this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);

                } else {
                    ctx.filter = this.blur > 0 ? `blur(${this.blur}px) brightness(${1 + this.blur * 0.05})` : 'none';
                }
                // --- END BRIGHT LINE BORDER ---

                ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                ctx.restore();
            }
        }
    }


    // ====================== SETUP & MAIN SPIN ======================
    const reels = [];
    let spinning = false;
    let glowing = false;

    const init = () => {
        for (let i = 0; i < REELS; i++) {
            reels.push(new Reel(i * (SYMBOL_SIZE + GAP), i));
        }
        draw();
    };

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        reels.forEach(r => {
            r.update();
            r.draw();
        });
        if (spinning || glowing) requestAnimationFrame(draw);
    };

    const startSpin = async () => {
        if (spinning || glowing) return;
        const bet = parseInt(betInput.value, 10) || 50;
        if (bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough balance!');

        resultDisplay.textContent = '';
        spinBtn.disabled = true;

        currentBalance -= bet;
        // FIX 2: Use formatChips when deducting the bet
        balanceDisplay.textContent = formatChips(currentBalance);

        try {
            const data = await actualServerSpin(bet);
            const finalSymbolsFromServer = data.finalSymbols;

            spinning = true;
            reels.forEach(r => r.start());
            draw();

            reels.forEach((r, i) => setTimeout(() => r.stop(finalSymbolsFromServer[i]), i * 800 + 1000));

            const stopTime = 1000 + REELS * 800 + 2000;
            setTimeout(() => {
                spinning = false;
                currentBalance = data.balance; // Update the raw balance

                // FIX 3: Use formatChips when updating the balance with server data
                balanceDisplay.textContent = formatChips(currentBalance);

                if (data.winnings > 0) {
                    // FIX: Format winnings using formatChips
                    resultDisplay.textContent = `You won ৳${formatChips(data.winnings)}!`;
                    glowing = true;
                    draw();
                    setTimeout(() => {
                        glowing = false;
                        spinBtn.disabled = false;
                    }, 3000);
                    return;
                }

                spinBtn.disabled = false;
            }, stopTime);

        } catch (err) {
            console.error(err);
            alert(err.message || 'Spin error');
            currentBalance += bet;
            // FIX 4: Use formatChips when refunding the bet on error
            balanceDisplay.textContent = formatChips(currentBalance);
            spinBtn.disabled = false;
        }
    };

    spinBtn.addEventListener('click', startSpin);
});