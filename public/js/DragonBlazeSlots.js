document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('slotCanvas');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spinBtn');
    const balanceDisplay = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const resultDisplay = document.getElementById('result');

    // ======= Compact Chip Formatter =======
    const formatChips = (amount) => {
        if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        }).format(amount);
    };

    // ======= Config =======
    const REELS = 5, ROWS = 4, SYMBOL_SIZE = 100, GAP = 8;
    const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP;
    const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let currentBalance = parseFloat(balanceDisplay.dataset.rawChips) || parseFloat(balanceDisplay.textContent) || 0;
    balanceDisplay.textContent = formatChips(currentBalance);

    betInput.addEventListener("blur", () => {
        let val = parseInt(betInput.value);
        if (isNaN(val) || val < 200) betInput.value = 200;
        if (val > 10000) betInput.value = 10000;
    });

    // ======= Symbols =======
    const symbols = [
        'blazeCrown', 'dragonBlaze', 'dragonEye', 'emberCoin', 'fireRune',
        'flameSword', 'goldenDragon', 'lavaShield', 'phoenixFeather'
    ].map(name => ({
        name,
        file: `/images/DragonBlazeSlots/${name}.png`
    }));

    const loadedSymbols = [];
    let loadedCount = 0;
    symbols.forEach(s => {
        const img = new Image();
        img.src = s.file;
        img.onload = () => {
            loadedCount++;
            if (loadedCount === symbols.length) init();
        };
        loadedSymbols.push({ img, name: s.name, file: s.file });
    });

    // ======= Server Call =======
    const actualServerSpin = async (bet) => {
        const response = await fetch('/slots/spin?type=DragonBlaze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet, slotType: 'DragonBlaze' })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || 'Server request failed');
        return data;
    };

    // ======= Reel Class =======
    class Reel {
        constructor(x, index) {
            this.x = x; this.index = index;
            this.position = 0; this.speed = 0;
            this.target = null; this.stopping = false;
            this.settled = false; this.blur = 0;
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
                let imgData, isWinningSymbol = false;
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

                // Draw symbol
                if (this.blur > 0) ctx.filter = `blur(${this.blur}px) brightness(${1 + this.blur * 0.05})`;
                ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                ctx.restore();

                // Glow border if winning
                if (isWinningSymbol && glowing) {
                    const glowAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 100);
                    const gradient = ctx.createLinearGradient(this.x, y, this.x + SYMBOL_SIZE, y + SYMBOL_SIZE);
                    gradient.addColorStop(0, `rgba(255, 200, 50, ${glowAlpha})`);
                    gradient.addColorStop(1, `rgba(255, 100, 0, ${glowAlpha})`);
                    ctx.strokeStyle = gradient;
                    ctx.lineWidth = 4;
                    ctx.strokeRect(this.x + 2, y + 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4);
                }
            }
        }
    }

    // ======= Effects =======
    const reels = [];
    let spinning = false, glowing = false, particles = [];

    const createParticles = () => {
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * CANVAS_WIDTH,
                y: CANVAS_HEIGHT,
                size: Math.random() * 3 + 1,
                speedY: 2 + Math.random() * 3,
                alpha: 1
            });
        }
    };

    const drawParticles = () => {
        particles.forEach(p => {
            ctx.fillStyle = `rgba(255, ${120 + Math.random() * 50}, 0, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            p.y -= p.speedY;
            p.alpha -= 0.02;
        });
        particles = particles.filter(p => p.alpha > 0);
    };

    const drawFlameBackground = () => {
        const flicker = 0.05 + Math.sin(Date.now() / 150) * 0.05;
        const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        grd.addColorStop(0, `rgba(20, 0, 0, 1)`);
        grd.addColorStop(1, `rgba(255, 50, 0, ${0.3 + flicker})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    };

    // ======= Main =======
    const init = () => {
        for (let i = 0; i < REELS; i++) {
            reels.push(new Reel(i * (SYMBOL_SIZE + GAP), i));
        }
        draw();
    };

    let glowingDragonEyes = [];
    let dragonEyeGlowTime = 0;

    const draw = () => {
        drawFlameBackground();
        reels.forEach(r => { r.update(); r.draw(); });

        // Dragon Eye +10% fade animation
        if (glowingDragonEyes.length && dragonEyeGlowTime > 0) {
            const alpha = Math.sin(Date.now() / 200) * 0.5 + 0.5;
            const goldAlpha = alpha * 0.9 + 0.1;
            ctx.fillStyle = `rgba(255, 215, 0, ${goldAlpha})`; // golden
            ctx.font = '28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            glowingDragonEyes.forEach(pos => {
                const x = pos.x * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
                const y = pos.y * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
                ctx.fillText('+10%', x, y);
            });
            dragonEyeGlowTime -= 16;
            if (dragonEyeGlowTime <= 0) glowingDragonEyes = [];
        }

        if (glowing && particles.length) drawParticles();
        if (spinning || glowing || glowingDragonEyes.length) requestAnimationFrame(draw);
    };

    const startSpin = async () => {
        if (spinning || glowing || glowingDragonEyes.length) return;

        const bet = parseInt(betInput.value, 10) || 50;
        if (bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough balance!');

        resultDisplay.textContent = '';
        spinBtn.disabled = true;

        // Optimistic balance deduction
        currentBalance -= bet;
        balanceDisplay.textContent = formatChips(currentBalance);

        try {
            const data = await actualServerSpin(bet);
            const finalSymbolsFromServer = data.finalSymbols;

            // Start reel spinning animation
            spinning = true;
            reels.forEach(r => r.start());
            draw();

            // Stop reels with stagger
            reels.forEach((r, i) =>
                setTimeout(() => r.stop(finalSymbolsFromServer[i]), i * 800 + 1000)
            );

            const stopTime = 1000 + REELS * 800 + 2000;
            setTimeout(() => {
                spinning = false;

                // Update balance from server
                currentBalance = data.balance;
                balanceDisplay.textContent = formatChips(currentBalance);

                // Check for Dragon Eye bonus
                let dragonEyeBonus = 0;
                finalSymbolsFromServer.forEach(reelSymbols => {
                    reelSymbols.forEach(symbol => {
                        if (symbol.name === 'dragonEye') {
                            dragonEyeBonus += bet * 0.10; // 10% of bet per dragonEye
                        }
                    });
                });

                if (dragonEyeBonus > 0) {
                    currentBalance += dragonEyeBonus;
                    balanceDisplay.textContent = formatChips(currentBalance);

                    // Prepare animation positions
                    glowingDragonEyes = finalSymbolsFromServer.map((reelSymbols, reelIndex) =>
                        reelSymbols.map((symbol, rowIndex) =>
                            symbol.name === 'dragonEye' ? { x: reelIndex, y: rowIndex } : null
                        )
                    ).flat().filter(Boolean);

                    dragonEyeGlowTime = 2000; // 2 seconds fade-in/out
                }

                // Normal winnings animation
                if (data.winnings > 0) {
                    resultDisplay.textContent = `You won ৳${formatChips(data.winnings)}!`;

                    glowing = true;
                    createParticles(); // sparks!
                    draw();

                    setTimeout(() => {
                        glowing = false;
                        spinBtn.disabled = false;
                    }, 3500);
                } else {
                    spinBtn.disabled = false;
                }

            }, stopTime);

        } catch (err) {
            console.error(err);
            alert(err.message || 'Spin error');

            // Refund bet if error
            currentBalance += bet;
            balanceDisplay.textContent = formatChips(currentBalance);
            spinBtn.disabled = false;
        }
    };


    spinBtn.addEventListener('click', startSpin);
});
