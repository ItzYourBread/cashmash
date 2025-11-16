/* slotEngine.js
   Single engine for multiple slot types (uses global `slotsConfig`).
   Canvas: <canvas id="slotCanvas" data-slot-type="PharaohsRiches"></canvas>
   Controls: #spinBtn, #balance (data-raw-balance), #betAmount
   Result display: #resultText + #resultAmount (new)
*/

(function () {
  if (typeof document === 'undefined') return;
  const HUB = window.slotsConfig || null;
  if (!HUB) return console.error('slotEngine: slotsConfig not found');

  // DOM
  const canvas = document.getElementById('slotCanvas');
  if (!canvas) return console.error('slotEngine: #slotCanvas not found');
  const ctx = canvas.getContext('2d');

  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');

  // result UI
  const resultText = document.getElementById('resultText');
  const resultAmount = document.getElementById('resultAmount');

  // helper message UI
  function showMessage(type, amount = null) {
    if (!resultText || !resultAmount) return;
    switch (type) {
      case 'start':
        resultText.textContent = 'Best of Luck';
        resultAmount.textContent = '';
        break;
      case 'win':
        resultText.textContent = 'Win';
        resultAmount.textContent = `৳${formatBalance(amount)}`;
        resultAmount.classList.add('animate');
        setTimeout(() => resultAmount.classList.remove('animate'), 900);
        break;
      case 'lose':
        resultText.textContent = 'Try Again';
        resultAmount.textContent = '';
        break;
    }
  }

  // choose slot
  const slotType = (canvas.dataset && canvas.dataset.slotType) || 'ClassicSlot';
  const cfg = HUB[slotType];
  if (!cfg) return console.error('slotEngine: config for', slotType, 'not found');

  // formatting
  const formatBalance = (amount) => {
    if (amount === null || amount === undefined) return '0';
    if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  };

  // balance init
  let currentBalance =
    parseFloat(balanceDisplay?.dataset?.rawChips) ||
    parseFloat(balanceDisplay?.textContent) ||
    0;
  if (balanceDisplay) balanceDisplay.textContent = formatBalance(currentBalance);

  // bet limits
  const MIN_BET = Number.isFinite(cfg.minBet) ? cfg.minBet : 1;
  const MAX_BET = Number.isFinite(cfg.maxBet) ? cfg.maxBet : 100000000;

  if (betInput) {
    betInput.min = MIN_BET;
    betInput.max = MAX_BET;
    betInput.placeholder = `${MIN_BET}-${MAX_BET}`;
    let initialBet = parseInt(betInput.value, 10);
    if (isNaN(initialBet) || initialBet < MIN_BET || initialBet > MAX_BET) betInput.value = MIN_BET;
    betInput.addEventListener('blur', () => {
      let v = parseInt(betInput.value, 10);
      if (isNaN(v) || v < MIN_BET) betInput.value = MIN_BET;
      if (v > MAX_BET) betInput.value = MAX_BET;
    });
  }

  // canvas geometry
  const REELS = cfg.reels || 5;
  const ROWS = cfg.rows || 4;
  const SYMBOL_SIZE = 100;
  const GAP = 8;
  const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP;
  const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // load symbols
  const symbolsCfg = cfg.symbols || [];
  const loadedSymbols = [];
  let loadedCount = 0;
  symbolsCfg.forEach((s) => {
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

  // server spin
  const fetchServerSpin = async (bet) => {
    const res = await fetch(`/slots/spin?type=${encodeURIComponent(slotType)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet, slotType }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Server error');
    return data;
  };

  // Reel class
  class Reel {
    constructor(x, idx) {
      this.x = x; this.idx = idx;
      this.pos = 0; this.speed = 0; this.target = null;
      this.stopping = false; this.settled = false; this.blur = 0;
    }
    start() {
      this.speed = 35 + Math.random() * 9;
      this.stopping = false; this.settled = false; this.blur = 0;
    }
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
    draw(ctx, symbols, glow) {
      const yOffset = -this.pos;
      for (let i = 0; i < ROWS + 2; i++) {
        let imgData, isWin = false;
        if (this.settled && this.target) {
          const idx = i % ROWS;
          const s = this.target[idx];
          const match = symbols.find(x => x.file === s.file);
          imgData = match ? match.img : (symbols[0] && symbols[0].img);
          if (s.win) isWin = true;
        } else {
          imgData = (symbols[Math.floor(Math.random() * symbols.length)] || {}).img;
        }
        const y = yOffset + i * (SYMBOL_SIZE + GAP);
        ctx.save();
        if (this.blur > 0) ctx.filter = `blur(${this.blur}px) brightness(${1 + this.blur * 0.04})`;
        if (imgData) ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);
        ctx.restore();

        if (isWin && glow) {
          const glowAlpha = 0.65 + 0.35 * Math.sin(Date.now() / 120);
          ctx.strokeStyle = `rgba(255,215,0,${glowAlpha})`;
          ctx.lineWidth = 4;
          ctx.strokeRect(this.x + 2, y + 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4);
        }
      }
    }
  }

  // engine state
  const reels = [];
  let spinning = false, glowing = false;
  let particles = [];
  let bonusMarkers = []; // {x,y,text,ms}

  const createParticles = (count = 25, colorFn) => {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: CANVAS_HEIGHT,
        size: Math.random() * 3 + 1,
        speedY: 1.5 + Math.random() * 2.5,
        alpha: 1,
        color: colorFn ? colorFn() : `rgba(255,215,0,1)`,
      });
    }
  };
  const drawParticles = (ctx) => {
    particles.forEach(p => {
      ctx.fillStyle = p.color.replace(/,1\)$/, `,${p.alpha})`) || p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      p.y -= p.speedY; p.alpha -= 0.02;
    });
    particles = particles.filter(p => p.alpha > 0);
  };

  // background
  function drawBackground(ctx) {
    const t = Date.now(); const base = slotType.toLowerCase();
    if (base.includes('pharaoh')) {
      const flick = 0.04 + Math.sin(t / 200) * 0.04;
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      g.addColorStop(0, `rgba(255,235,170,${0.3 + flick})`);
      g.addColorStop(1, `rgba(90,50,20,1)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (base.includes('dragon')) {
      const flick = 0.05 + Math.sin(t / 150) * 0.05;
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      g.addColorStop(0, `rgba(20,0,0,1)`); g.addColorStop(1, `rgba(200,40,0,${0.35 + flick})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      g.addColorStop(0, `rgba(40,80,140,0.4)`); g.addColorStop(1, `rgba(20,40,80,1)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  // draw loop
  function draw() {
    drawBackground(ctx);
    reels.forEach(r => { r.update(spinning); r.draw(ctx, loadedSymbols, glowing); });

    // draw bonus markers
    bonusMarkers = bonusMarkers.filter(b => b.ms > 0);
    bonusMarkers.forEach(b => {
      ctx.fillStyle = `rgba(255,215,0,${Math.max(0.12, b.ms / 1600)})`;
      ctx.font = '26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const x = b.x * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
      const y = b.y * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
      ctx.fillText(b.text, x, y);
      b.ms -= 16;
    });

    if (glowing && particles.length) drawParticles(ctx);

    if (spinning || glowing || bonusMarkers.length || particles.length) requestAnimationFrame(draw);
  }

  function init() {
    for (let i = 0; i < REELS; i++) reels.push(new Reel(i * (SYMBOL_SIZE + GAP), i));
    draw();
  }

  // spin flow
  async function startSpin() {
    if (spinning || glowing || bonusMarkers.length) return;
    const bet = parseInt(betInput?.value, 10) || MIN_BET;
    if (bet < MIN_BET) return alert(`Minimum bet is ৳${MIN_BET}`);
    if (bet > MAX_BET) return alert(`Maximum bet is ৳${MAX_BET}`);
    if (bet > currentBalance) return alert('Not enough balance!');

    showMessage('start');
    spinBtn && (spinBtn.disabled = true);

    // optimistic deduction
    currentBalance -= bet;
    if (balanceDisplay) balanceDisplay.textContent = formatBalance(currentBalance);

    try {
      const data = await fetchServerSpin(bet);
      const finalSymbols = data.finalSymbols; // expected: array of columns => each column is array of rows {name,file,win}
      spinning = true;
      reels.forEach(r => r.start());
      draw();

      // stagger stop
      reels.forEach((r, i) => setTimeout(() => r.stop(finalSymbols[i]), i * 420 + 40));

      const stopTime = 1400 + REELS * 250;
      setTimeout(() => {
        spinning = false;
        // update server balance
        currentBalance = data.balance;
        if (balanceDisplay) balanceDisplay.textContent = formatBalance(currentBalance);

        // detect bonuses and mark them visually & calculate bonusAdded
        let bonusAdded = 0;
        // Pharaohs +5% per pharaoh
        if (slotType === 'PharaohsRiches') {
          finalSymbols.forEach((col, ci) => col.forEach((s, ri) => {
            if (s && s.name === 'pharaoh') {
              bonusAdded += bet * 0.05;
              bonusMarkers.push({ x: ci, y: ri, text: '+5%', ms: 1600 });
            }
          }));
        }
        // DragonBlaze +10% per dragonEye
        if (slotType === 'DragonBlaze') {
          finalSymbols.forEach((col, ci) => col.forEach((s, ri) => {
            if (s && s.name === 'dragonEye') {
              bonusAdded += bet * 0.10;
              bonusMarkers.push({ x: ci, y: ri, text: '+10%', ms: 1600 });
            }
          }));
        }
        // ClassicSlot: show JACKPOT markers for jackpot symbol (no automatic cash unless server returns)
        // if (slotType === 'ClassicSlot') {
        //   finalSymbols.forEach((col, ci) => col.forEach((s, ri) => {
        //     if (s && s.name === 'jackpot') {
        //       bonusMarkers.push({ x: ci, y: ri, text: 'JACKPOT', ms: 2000 });
        //     }
        //   }));
        // }

        // apply bonusAdded to balance
        if (bonusAdded > 0) {
          currentBalance += bonusAdded;
          if (balanceDisplay) balanceDisplay.textContent = formatBalance(currentBalance);
        }

        // winnings handling (server gives numeric winnings)
        if (data.winnings > 0) {
          glowing = true;
          showMessage('win', data.winnings);
          // particle color by slot
          const colorFn = slotType === 'DragonBlaze'
            ? (() => `rgba(${200 + Math.floor(Math.random() * 55)},${50 + Math.floor(Math.random() * 80)},0,0.9)`)
            : (() => `rgba(255,215,0,0.9)`);
          createParticles(30, colorFn);
          draw();
          setTimeout(() => {
            glowing = false;
            spinBtn && (spinBtn.disabled = false);
          }, 1200);
        } else {
          showMessage('lose');
          spinBtn && (spinBtn.disabled = false);
        }
      }, stopTime);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Spin error');
      currentBalance += bet; // refund
      if (balanceDisplay) balanceDisplay.textContent = formatBalance(currentBalance);
      spinBtn && (spinBtn.disabled = false);
    }
  }

  if (spinBtn) spinBtn.addEventListener('click', startSpin);
})();
