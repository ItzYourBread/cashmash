/* slotEngine.js
   Single engine for multiple slot types (uses global `slotsConfig`).
   - Canvas: <canvas id="slotCanvas" data-slot-type="PharaohsRiches"></canvas>
   - Buttons/inputs: #spinBtn, #balance (data-raw-chips), #betAmount, #result
   - Server spin endpoint: POST /slots/spin?type=<slotType>
*/

(function () {
    // --- quick runtime checks ---
    if (typeof document === 'undefined') return;
    const HUB = window.slotsConfig || window.SLOTS_CONFIG || window.SLOTS || null;
    if (!HUB) return console.error('slotEngine: slotsConfig not found on window (window.slotsConfig)');

    // --- DOM --- 
    const canvas = document.getElementById('slotCanvas');
    if (!canvas) return console.error('slotEngine: #slotCanvas not found');
    const ctx = canvas.getContext('2d');
    const spinBtn = document.getElementById('spinBtn');
    const balanceDisplay = document.getElementById('balance');
    const betInput = document.getElementById('betAmount');
    const resultDisplay = document.getElementById('result');

    // --- choose slot ---
    const slotType = (canvas.dataset && canvas.dataset.slotType) || window.SLOT_TYPE || 'ClassicSlot';
    const cfg = HUB[slotType];
    if (!cfg) return console.error('slotEngine: config for', slotType, 'not found');

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

    // --- balance initialization ---
    let currentBalance =
        parseFloat(balanceDisplay?.dataset?.rawChips) ||
        parseFloat(balanceDisplay?.textContent) ||
        0;

    if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

    // --- per-slot bet limits (from config) ---
    const MIN_BET = Number.isFinite(cfg.minBet) ? cfg.minBet : 1;
    const MAX_BET = Number.isFinite(cfg.maxBet) ? cfg.maxBet : 100000000;

    // ensure bet input reflects slot-specific limits
    if (betInput) {
        betInput.min = MIN_BET;
        betInput.max = MAX_BET;
        betInput.placeholder = `${MIN_BET}-${MAX_BET}`;

        // initialize value: keep existing if valid, otherwise set to min
        let initialBet = parseInt(betInput.value, 10);
        if (isNaN(initialBet) || initialBet < MIN_BET || initialBet > MAX_BET) {
            betInput.value = MIN_BET;
        }

        // validation on blur using slot-specific limits
        betInput.addEventListener('blur', () => {
            let val = parseInt(betInput.value, 10);
            if (isNaN(val) || val < MIN_BET) betInput.value = MIN_BET;
            if (val > MAX_BET) betInput.value = MAX_BET;
        });
    }

    // --- canvas geometry from config ---
    const REELS = cfg.reels || 5;
    const ROWS = cfg.rows || 4;
    const SYMBOL_SIZE = 100;
    const GAP = 8;
    const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP;
    const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP;
    canvas.width = CANVAS_WIDTH; canvas.height = CANVAS_HEIGHT;

    // --- load symbols from config ---
    const symbolsCfg = cfg.symbols || [];
    const loadedSymbols = [];
    let loadedCount = 0;
    symbolsCfg.forEach(s => {
        const img = new Image();
        img.src = s.file;
        img.onload = () => {
            loadedCount++;
            if (loadedCount === symbolsCfg.length) init();
        };
        img.onerror = () => {
            console.warn('slotEngine: image failed', s.file);
            loadedCount++;
            if (loadedCount === symbolsCfg.length) init();
        };
        loadedSymbols.push(Object.assign({ img }, s));
    });

    // --- server spin (keeps same API as you used) ---
    const actualServerSpin = async (bet) => {
        const res = await fetch(`/slots/spin?type=${encodeURIComponent(slotType)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bet, slotType })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Server request failed');
        return data;
    };

    // --- Reel class (generic) ---
    class Reel {
        constructor(x, idx) { this.x = x; this.idx = idx; this.pos = 0; this.speed = 0; this.target = null; this.stopping = false; this.settled = false; this.blur = 0; }
        start() { this.speed = 35 + Math.random() * 8; this.stopping = false; this.settled = false; this.blur = 0; }
        stop(finalSymbols) { this.target = finalSymbols; this.stopping = true; }
        update(spinning) {
            if (!spinning) return;
            this.pos += this.speed;
            const band = SYMBOL_SIZE + GAP;
            if (this.pos >= band) this.pos -= band;
            if (this.stopping && !this.settled) {
                this.speed *= 0.52;
                if (this.speed < 1) { this.speed = 0; this.settled = true; this.pos = 0; }
            }
            this.blur = Math.min(this.speed / 10, 3);
        }
        draw(ctx, loadedSymbols, glowingFlag) {
            const yOffset = -this.pos;
            for (let i = 0; i < ROWS + 2; i++) {
                let imgData, isWin = false;
                if (this.settled && this.target) {
                    const idx = i % ROWS;
                    const symbolData = this.target[idx];
                    const match = loadedSymbols.find(s => s.file === symbolData.file);
                    imgData = match ? match.img : (loadedSymbols[0] && loadedSymbols[0].img);
                    if (symbolData.win) isWin = true;
                } else {
                    imgData = (loadedSymbols[Math.floor(Math.random() * loadedSymbols.length)] || {}).img;
                }
                const y = yOffset + i * (SYMBOL_SIZE + GAP);
                ctx.save();
                if (this.blur > 0) ctx.filter = `blur(${this.blur}px) brightness(${1 + this.blur * 0.04})`;
                if (imgData) ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
                ctx.restore();

                if (isWin && glowingFlag) {
                    const glowAlpha = 0.65 + 0.35 * Math.sin(Date.now() / 120);
                    ctx.strokeStyle = `rgba(255,215,0,${glowAlpha})`;
                    ctx.lineWidth = 4;
                    ctx.strokeRect(this.x + 2, y + 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4);
                }
            }
        }
    }

    // --- effects / engine state ---
    const reels = [];
    let spinning = false, glowing = false, particles = [];
    let bonusMarkers = []; // {x,y, text, ms}
    const createParticles = (count = 25, colorGen) => {
        for (let i = 0; i < count; i++) {
            particles.push({ x: Math.random() * CANVAS_WIDTH, y: CANVAS_HEIGHT, size: Math.random() * 3 + 1, speedY: 1.5 + Math.random() * 2.5, alpha: 1, color: colorGen ? colorGen() : `rgba(255,215,0,1)` });
        }
    };
    const drawParticles = (ctx) => {
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            p.y -= p.speedY; p.alpha -= 0.02;
        });
        particles = particles.filter(p => p.alpha > 0);
    };

    // --- background variants by slot (small visual differences) ---
    function drawBackground(ctx) {
        const t = Date.now();
        if (slotType.toLowerCase().includes('pharaoh')) {
            const flick = 0.04 + Math.sin(t / 200) * 0.04;
            const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            grd.addColorStop(0, `rgba(255,235,170,${0.3 + flick})`);
            grd.addColorStop(1, `rgba(90,50,20,1)`);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (slotType.toLowerCase().includes('dragon')) {
            const flick = 0.05 + Math.sin(t / 150) * 0.05;
            const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            grd.addColorStop(0, `rgba(20,0,0,1)`); grd.addColorStop(1, `rgba(200,40,0,${0.35 + flick})`);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            const grd = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            grd.addColorStop(0, `rgba(40,80,140,0.4)`); grd.addColorStop(1, `rgba(20,40,80,1)`);
            ctx.fillStyle = grd; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }

    // --- render loop ---
    function draw() {
        drawBackground(ctx);
        reels.forEach(r => { r.update(spinning); r.draw(ctx, loadedSymbols, glowing); });

        // draw bonus markers + text
        bonusMarkers = bonusMarkers.filter(b => b.ms > 0);
        bonusMarkers.forEach(b => {
            ctx.fillStyle = `rgba(255,215,0,${Math.max(0.15, b.ms / 1500)})`;
            ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const x = b.x * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
            const y = b.y * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
            ctx.fillText(b.text, x, y);
            b.ms -= 16;
        });

        if (glowing && particles.length) drawParticles(ctx);

        if (spinning || glowing || bonusMarkers.length) requestAnimationFrame(draw);
    }

    // --- init reels & start loop once images loaded ---
    function init() {
        for (let i = 0; i < REELS; i++) reels.push(new Reel(i * (SYMBOL_SIZE + GAP), i));
        draw();
    }

    // --- Start spin logic (generic) ---
    async function startSpin() {
        if (spinning || glowing || bonusMarkers.length) return;
        const bet = parseInt(betInput && betInput.value, 10) || 1;
        if (bet <= 0) return alert('Enter a valid bet!');
        if (bet > currentBalance) return alert('Not enough balance!');
        resultDisplay && (resultDisplay.textContent = '');
        spinBtn && (spinBtn.disabled = true);

        // optimistic deduction
        currentBalance -= bet;
        if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

        try {
            const data = await actualServerSpin(bet);
            const finalSymbolsFromServer = data.finalSymbols; // expect array[reel][row]{name,file,win}
            spinning = true;
            reels.forEach(r => r.start());
            draw();

            // stagger stops
            reels.forEach((r, i) => setTimeout(() => r.stop(finalSymbolsFromServer[i]), i * 420 + 20));

            // compute stopTime (approx)
            const stopTime = 1200 + REELS * 250;
            setTimeout(() => {
                spinning = false;
                // server balance
                currentBalance = data.balance;
                if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

                // --- handle special bonuses (small, extensible) ---
                // Pharaohs: +5% per pharaoh symbol
                let bonusAdded = 0;
                if (slotType === 'PharaohsRiches') {
                    finalSymbolsFromServer.forEach((col, ci) => col.forEach((s, ri) => {
                        if (s && s.name === 'pharaoh') {
                            bonusAdded += bet * 0.05;
                            bonusMarkers.push({ x: ci, y: ri, text: '+5%', ms: 1600 });
                        }
                    }));
                }
                // DragonBlaze: +10% per dragonEye
                if (slotType === 'DragonBlaze') {
                    finalSymbolsFromServer.forEach((col, ci) => col.forEach((s, ri) => {
                        if (s && s.name === 'dragonEye') {
                            bonusAdded += bet * 0.10;
                            bonusMarkers.push({ x: ci, y: ri, text: '+10%', ms: 1600 });
                        }
                    }));
                }
                // ClassicSlot: jackpot symbol gives multiplier (example: if jackpot present add large win)
                // if (slotType === 'ClassicSlot') {
                //     finalSymbolsFromServer.forEach((col, ci) => col.forEach((s, ri) => {
                //         if (s && s.name === 'jackpot') {
                //             bonusMarkers.push({ x: ci, y: ri, text: 'JACKPOT', ms: 2000 });
                //         }
                //     }));
                // }

                if (bonusAdded > 0) {
                    currentBalance += bonusAdded;
                    if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);
                }

                // winnings animation
                if (data.winnings > 0) {
                    resultDisplay && (resultDisplay.textContent = `You won ৳${formatChips(data.winnings)}!`);
                    glowing = true;
                    // particle color depends on slot
                    const colorGen = slotType === 'DragonBlaze' ? (() => `rgba(${200 + Math.floor(Math.random() * 55)},${50 + Math.floor(Math.random() * 80)},0,${0.9})`) : (() => `rgba(255,215,0,${0.9})`);
                    createParticles(28, colorGen);
                    draw();
                    setTimeout(() => { glowing = false; spinBtn && (spinBtn.disabled = false); }, 1000);
                } else {
                    spinBtn && (spinBtn.disabled = false);
                }
            }, stopTime);

        } catch (err) {
            console.error(err);
            alert(err.message || 'Spin error');
            // refund bet
            currentBalance += bet;
            if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);
            spinBtn && (spinBtn.disabled = false);
        }
    }

    // --- bind button ---
    if (spinBtn) spinBtn.addEventListener('click', startSpin);

})();
