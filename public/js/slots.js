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
        if (isNaN(val) || val < 10) betInput.value = 10;
        if (val > 1000) betInput.value = 1000;
    });

    // ====================== CONFIG ======================
    const REELS = 5;
    const ROWS = 4;
    const SYMBOL_SIZE = 100;
    const GAP = 8;

    // FIX: Corrected canvas width/height calculation
    const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP;
    const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // FIX: Get raw balance from a data attribute if available, or default.
    let currentBalance = parseFloat(balanceDisplay.dataset.rawChips) || parseFloat(balanceDisplay.textContent) || 0;
    
    // FIX: Set initial balance display using the formatter (Now defined!)
    balanceDisplay.textContent = formatChips(currentBalance); 

    // Define symbols needed only for image loading and lookup
    const symbols = [
        { name: 'cherry', file: '/images/ClassicSlot/cherry.png' },
        { name: 'lemon', file: '/images/ClassicSlot/lemon.png' },
        { name: 'orange', file: '/images/ClassicSlot/orange.png' },
        { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png' },
        { name: 'grapes', file: '/images/ClassicSlot/grapes.png' },
        { name: 'star', file: '/images/ClassicSlot/star.png' },
        { name: 'red7', file: '/images/ClassicSlot/red7.png' },
        { name: 'diamond', file: '/images/ClassicSlot/diamond.png' },
        { name: 'bar', file: '/images/ClassicSlot/bar.png' },
        { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png' },
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

    // --- SERVER COMMUNICATION ---
    const actualServerSpin = async (bet) => {
        const response = await fetch('/slots/spin?type=ClassicSlot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // ADD AUTHORIZATION HEADER HERE
            },
            body: JSON.stringify({ bet })
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

                // --- BRIGHT LINE BORDER (Clear, bright lines) ---
                if (isWinningSymbol && glowing) {
                    ctx.strokeStyle = 'gold'; // Using cyan for high visibility
                    ctx.lineWidth = 4;        
                    ctx.lineJoin = 'round';

                    ctx.strokeRect(this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);

                } else {
                    // Keep the existing filter logic for non-winning symbols
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
        const bet = parseInt(betInput.value, 10) || 10;
        if (bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough balance!');

        resultDisplay.textContent = '';
        spinBtn.disabled = true;

        // Optimistic balance update
        currentBalance -= bet;
        // FIX: Use formatChips
        balanceDisplay.textContent = formatChips(currentBalance);

        try {
            const data = await actualServerSpin(bet);
            const finalSymbolsFromServer = data.finalSymbols;

            // Start animation
            spinning = true;
            reels.forEach(r => r.start());
            draw();

            // Stop reels with staggered delay
            reels.forEach((r, i) => setTimeout(() => r.stop(finalSymbolsFromServer[i]), i * 800 + 1000));

            // After all reels settled
            const stopTime = 1000 + REELS * 800 + 2000;
            setTimeout(() => {
                spinning = false;

                // Update balance from the server's authoritative value
                currentBalance = data.balance;
                // FIX: Use formatChips
                balanceDisplay.textContent = formatChips(currentBalance);

                if (data.winnings > 0) {
                    // FIX: Use formatChips for winnings display
                    resultDisplay.textContent = `You won ৳${formatChips(data.winnings)}!`;

                    // START BRIGHT LINE ANIMATION
                    glowing = true;
                    draw();

                    const GLOW_DURATION = 3000;
                    setTimeout(() => {
                        glowing = false;
                        spinBtn.disabled = false;
                    }, GLOW_DURATION);

                    return;
                }

                // No win - loss condition
                spinBtn.disabled = false;

            }, stopTime);

        } catch (err) {
            console.error(err);
            alert(err.message || 'Spin error');
            // Revert balance if the spin failed
            currentBalance += bet;
            // FIX: Use formatChips when refunding the bet
            balanceDisplay.textContent = formatChips(currentBalance);
            spinBtn.disabled = false;
        }
    };

    spinBtn.addEventListener('click', startSpin);
});