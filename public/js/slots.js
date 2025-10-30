document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('slotCanvas');
    const ctx = canvas.getContext('2d');

    const spinBtn = document.getElementById('spinBtn');
    const balanceDisplay = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const resultDisplay = document.getElementById('result');

    // ====================== CONFIG (Incorporating your patterns) ======================
    const REELS = 5;
    const ROWS = 4;
    const SYMBOL_SIZE = 100;
    const GAP = 8;
    const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP);
    const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP);

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let currentBalance = parseInt(balanceDisplay.textContent, 10) || 1000;
    balanceDisplay.textContent = currentBalance;

    const symbols = [
        { name: 'cherry', file: '/images/ClassicSlot/cherry.png', multiplier: 1 },
        { name: 'lemon', file: '/images/ClassicSlot/lemon.png', multiplier: 1 },
        { name: 'orange', file: '/images/ClassicSlot/orange.png', multiplier: 1.5 },
        { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png', multiplier: 2 },
        { name: 'grapes', file: '/images/ClassicSlot/grapes.png', multiplier: 4 },
        { name: 'star', file: '/images/ClassicSlot/star.png', multiplier: 5 },
        { name: 'red7', file: '/images/ClassicSlot/red7.png', multiplier: 12 },
        { name: 'diamond', file: '/images/ClassicSlot/diamond.png', multiplier: 8 },
        { name: 'bar', file: '/images/ClassicSlot/bar.png', multiplier: 20 },
        { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 100 },
    ];
    
    const SYMBOL_MULTIPLIERS = symbols.reduce((map, sym) => {
        map[sym.name] = sym.multiplier;
        return map;
    }, {});
    
    // Weighted chances for random symbol selection (Total weight is 4594)
    const SYMBOL_CHANCES = {
        cherry: 45, lemon: 30, orange: 20, watermelon: 10, grapes: 9, 
        star: 8, red7: 5, diamond: 5, bar: 4, jackpot: 3
    };
    
    const PAYLINES = [
        [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
        [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 1, 2, 1, 0], [3, 2, 1, 2, 3],
        [1, 2, 3, 2, 1], [2, 1, 0, 1, 2], [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
        [0, 0, 1, 1, 2], [3, 3, 2, 2, 1]
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
        loadedSymbols.push(img);
    });

    // --- UTILITY FUNCTIONS FOR SERVER MOCK ---

    function getRandomWeightedSymbol() {
        const totalWeight = Object.values(SYMBOL_CHANCES).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (const name in SYMBOL_CHANCES) {
            random -= SYMBOL_CHANCES[name];
            if (random <= 0) {
                return symbols.find(s => s.name === name);
            }
        }
        // Fallback (shouldn't happen)
        return symbols[0]; 
    }

    /**
     * Checks the paylines against the resulting symbols grid and marks winning symbols.
     */
    function checkPaylines(symbolGrid) {
        let totalWinnings = 0;
        const reels = symbolGrid.length;
        
        // Use a mutable copy of the grid where symbols can be marked with `win: true`
        const winningSymbols = symbolGrid.map(reel => reel.map(symbol => ({...symbol, win: false})));

        for (const payline of PAYLINES) {
            let winLength = 0;
            let currentSymbolName = null;

            // Check the payline from left to right (Reel 0 to Reel 4)
            for (let r = 0; r < reels; r++) {
                const row = payline[r];
                const symbol = winningSymbols[r][row]; 
                const symbolName = symbol.name;

                if (r === 0) {
                    // Start of the line
                    currentSymbolName = symbolName;
                    winLength = 1;
                } else if (symbolName === currentSymbolName) {
                    // Match the symbol on the previous reel
                    winLength++;
                } else {
                    // Break the matching sequence
                    break;
                }
            }

            // --- Payout Calculation (Win requires 3 or more symbols) ---

            if (winLength >= 3) {
                // Get the multiplier for the winning symbol type
                const multiplier = SYMBOL_MULTIPLIERS[currentSymbolName];
                
                // Example Payout Logic (can be adjusted):
                let payoutFactor = 0;
                if (winLength === 3) payoutFactor = 1.0;
                else if (winLength === 4) payoutFactor = 3.0;
                else if (winLength === 5) payoutFactor = 5.0;

                // For simplicity, we assume the bet is the line bet
                const linePayout = multiplier * payoutFactor;
                totalWinnings += linePayout;

                // Mark the winning symbols with win: true
                for (let r = 0; r < winLength; r++) {
                    const row = payline[r];
                    // IMPORTANT: Ensure the symbol object has the `win: true` property set
                    winningSymbols[r][row].win = true; 
                }
            }
        }

        return { winnings: totalWinnings, finalSymbols: winningSymbols };
    }

    /**
     * Mocks the server-side spin, generates results, and checks for wins.
     */
    const mockServerSpin = (bet) => {
        return new Promise(resolve => {
            // 1. Generate the 5x4 result grid
            const resultGrid = [];
            for (let r = 0; r < REELS; r++) {
                const reelSymbols = [];
                for (let i = 0; i < ROWS; i++) {
                    // We generate more than 4 symbols per reel to ensure smooth stopping animation
                    // (The first 4 are the visible result, the rest are just padding)
                    reelSymbols.push(getRandomWeightedSymbol());
                }
                // Add padding symbols for smooth stop
                for (let i = 0; i < 4; i++) { 
                    reelSymbols.push(getRandomWeightedSymbol());
                }
                resultGrid.push(reelSymbols);
            }

            // 2. Check Paylines and calculate winnings
            const { winnings, finalSymbols } = checkPaylines(resultGrid.map(reel => reel.slice(0, ROWS))); // Pass only the visible 4 rows for check
            
            // Re-integrate the marked symbols into the full result grid for the client animation
            for (let r = 0; r < REELS; r++) {
                for (let i = 0; i < ROWS; i++) {
                    resultGrid[r][i] = finalSymbols[r][i];
                }
            }

            // 3. Resolve the server response
            resolve({
                finalSymbols: resultGrid, // Full grid with win: true flags
                winnings: winnings * bet, // Scale winnings by the original bet
                balance: currentBalance + (winnings * bet)
            });
        });
    };

    // ====================== REEL CLASS (Refined draw method) ======================
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
            this.glowIndices = [];
        }

        start() {
            this.speed = 40 + Math.random() * 20;
            this.stopping = false;
            this.settled = false;
            this.blur = 0;
            this.glowIndices = [];
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
                let img;
                let isWinningSymbol = false;
                
                if (this.settled && this.target) {
                    const idx = i % this.target.length;
                    // Find the symbol object from the target array
                    const symbolData = this.target[idx];
                    
                    // Find the preloaded image based on the symbol's file path
                    const match = loadedSymbols.find(s => s.src.includes(symbolData.file.split('/').pop()));
                    img = match || loadedSymbols[0];

                    // Check if the symbol object has the `win: true` flag set
                    if (symbolData.win) { 
                        isWinningSymbol = true;
                    }

                } else {
                    img = loadedSymbols[Math.floor(Math.random() * loadedSymbols.length)];
                }

                const y = yOffset + i * (SYMBOL_SIZE + GAP);

                // --- DRAWING LOGIC (Applied to each symbol) ---
                ctx.save(); 

                if (isWinningSymbol && glowing) { // Only glow if it's a winning symbol AND the global `glowing` state is true
                    // Apply GLOW settings (shadow)
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = 'gold'; 
                    // No motion blur filter when glowing
                } else {
                    // Apply MOTION BLUR settings (filter) or 'none' if settled/lost
                    ctx.filter = this.blur > 0 ? `blur(${this.blur}px) brightness(${1 + this.blur * 0.05})` : 'none';
                }
                
                // Draw the image
                ctx.drawImage(img, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                
                // Restore context to remove shadow/filter for the next symbol
                ctx.restore(); 
            }
        }
    }

    // ====================== SETUP & MAIN SPIN ======================
    const reels = [];
    let spinning = false;
    let glowing = false; // State to keep animation loop running for glow

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
        // Loop continues if spinning OR glowing
        if (spinning || glowing) requestAnimationFrame(draw); 
    };

    const startSpin = async () => {
        if (spinning || glowing) return; 
        const bet = parseInt(betInput.value, 10) || 1;
        if (bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough chips!');

        resultDisplay.textContent = '';
        spinBtn.disabled = true;

        currentBalance -= bet;
        balanceDisplay.textContent = currentBalance;

        try {
            // Call the mock server function
            const data = await mockServerSpin(bet);
            const finalSymbols = data.finalSymbols; 
            
            spinning = true;
            reels.forEach(r => r.start());
            draw();

            // Stop reels with staggered delay
            reels.forEach((r, i) => setTimeout(() => r.stop(finalSymbols[i]), i * 800 + 1000));

            // After all reels settled
            const stopTime = 1000 + REELS * 800 + 2000;
            setTimeout(() => {
                spinning = false;
                currentBalance = data.balance;
                balanceDisplay.textContent = currentBalance;

                if (data.winnings > 0) {
                    resultDisplay.textContent = `🎉 You won ${data.winnings.toFixed(2)} chips!`;
                    
                    // START GLOW ANIMATION
                    glowing = true; 
                    draw(); // Force redraw to start glow

                    const GLOW_DURATION = 3000; // 3 seconds for the glow

                    setTimeout(() => {
                        // End glow effect
                        glowing = false; // Stops the draw loop
                        spinBtn.disabled = false; 
                    }, GLOW_DURATION);

                    return; 
                } 
                
                // No win - loss condition
                resultDisplay.textContent = '😢 No win this time!';
                spinBtn.disabled = false;

            }, stopTime);

        } catch (err) {
            console.error(err);
            alert(err.message || 'Spin error');
            currentBalance += bet;
            balanceDisplay.textContent = currentBalance;
            spinBtn.disabled = false;
        }
    };

    spinBtn.addEventListener('click', startSpin);
});