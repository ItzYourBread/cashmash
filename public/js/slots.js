document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('slotCanvas');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spinBtn');
    const balanceDisplay = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const resultDisplay = document.getElementById('result');

    // --- Number formatter (K/M/B compact style) ---
    const formatChips = (amount) => {
        if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        }).format(amount);
    };

    // --- Bet input guard ---
    betInput.addEventListener("blur", () => {
        let val = parseInt(betInput.value);
        if (isNaN(val) || val < 75) betInput.value = 75;
        if (val > 5000) betInput.value = 5000;
    });

    // --- Canvas config ---
    const REELS = 5, ROWS = 4, SYMBOL_SIZE = 100, GAP = 8;
    canvas.width = REELS * (SYMBOL_SIZE + GAP) - GAP;
    canvas.height = ROWS * (SYMBOL_SIZE + GAP) - GAP;

    let currentBalance = parseFloat(balanceDisplay.dataset.rawChips) || parseFloat(balanceDisplay.textContent) || 0;
    balanceDisplay.textContent = formatChips(currentBalance);

    // --- Symbol list ---
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

    const loadedSymbols = [];
    let loadedCount = 0;
    symbols.forEach(s => {
        const img = new Image();
        img.src = s.file;
        img.onload = () => {
            loadedCount++;
            if (loadedCount === symbols.length) init();
        };
        loadedSymbols.push({ name: s.name, img });
    });

    // --- Reel class ---
    class Reel {
        constructor(x) {
            this.x = x;
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
            if (this.position >= SYMBOL_SIZE + GAP) this.position -= SYMBOL_SIZE + GAP;
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
                    const match = loadedSymbols.find(s => s.name === symbolData.name);
                    imgData = match ? match.img : loadedSymbols[0].img;
                    if (symbolData.win) isWinningSymbol = true;
                } else {
                    imgData = loadedSymbols[Math.floor(Math.random() * loadedSymbols.length)].img;
                }
                const y = yOffset + i * (SYMBOL_SIZE + GAP);
                ctx.save();
                if (isWinningSymbol && glowing) {
                    ctx.strokeStyle = 'gold';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                } else {
                    ctx.filter = this.blur > 0 ? `blur(${this.blur}px) brightness(${1 + this.blur * 0.05})` : 'none';
                }
                ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                ctx.restore();
            }
        }
    }

    // --- Game state ---
    const reels = [];
    let spinning = false;
    let glowing = false;

    const init = () => {
        for (let i = 0; i < REELS; i++) {
            reels.push(new Reel(i * (SYMBOL_SIZE + GAP)));
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

    // --- Actual server call (System + RNG handled server-side) ---
    const actualServerSpin = async (bet) => {
        const res = await fetch('/slots/spin?type=ClassicSlot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Spin failed');
        return data;
    };

    // --- Spin logic ---
    const startSpin = async () => {
        if (spinning || glowing) return;
        const bet = parseInt(betInput.value, 10);
        if (!bet || bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough balance!');

        resultDisplay.textContent = '';
        spinBtn.disabled = true;

        currentBalance -= bet;
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
                currentBalance = data.balance;
                balanceDisplay.textContent = formatChips(currentBalance);

                if (data.winnings > 0) {
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
            balanceDisplay.textContent = formatChips(currentBalance);
            spinBtn.disabled = false;
        }
    };

    spinBtn.addEventListener('click', startSpin);
});
