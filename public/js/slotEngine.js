/* ==========================================================================
   SLOT ENGINE (Universal)
   - Renders Canvas (Reels, Particles, Animations)
   - Connects Game Logic to the "Control Dock" UI
   ========================================================================== */

(function () {
  if (typeof document === 'undefined') return;
  const HUB = window.slotsConfig || null;
  if (!HUB) return console.error('slotEngine: slotsConfig not found');

  // ================= DOM ELEMENTS =================
  const canvas = document.getElementById('slotCanvas');
  if (!canvas) return console.error('slotEngine: #slotCanvas not found');
  const ctx = canvas.getContext('2d');

  // Hidden Inputs (Bridge to UI)
  const hiddenSpinBtn = document.getElementById('spinBtn');
  const hiddenBetInput = document.getElementById('betAmount');
  const balanceDisplay = document.getElementById('balance');

  // New Control Dock UI Elements
  const actionBtn = document.getElementById('actionBtn');
  const btnText = actionBtn ? actionBtn.querySelector('.btn-text') : null;
  const btnSubtext = actionBtn ? actionBtn.querySelector('.btn-subtext') : null;

  // New HUD Elements
  const resultAmount = document.getElementById('resultAmount');
  const statusText = document.getElementById('statusText');

  // ================= CONFIGURATION =================
  const slotType = (canvas.dataset && canvas.dataset.slotType) || 'ClassicSlot';
  const cfg = HUB[slotType];
  if (!cfg) return console.error('slotEngine: config for', slotType, 'not found');

  const formatChips = (amount) => {
    if (amount === null || amount === undefined) return '0.00';

    const num = Number(amount);
    if (isNaN(num)) return '0.00';

    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Initialize Balance
  let currentBalance = parseFloat(balanceDisplay?.dataset?.rawBalance) || parseFloat(balanceDisplay?.textContent) || 0;
  if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

  // ================= CANVAS GEOMETRY =================
  const REELS = cfg.reels || 5;
  const ROWS = cfg.rows || 4;
  const SYMBOL_SIZE = 120; // Increased for higher resolution on modern screens
  const GAP = 10;
  const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - GAP;
  const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - GAP;

  // Set internal resolution (CSS handles display size)
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // ================= ASSET LOADING =================
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

  // ================= UI STATE MANAGEMENT =================
  function updateUIState(state, data = null) {
    if (!actionBtn || !statusText) return;

    switch (state) {
      case 'SPINNING':
        // Controlled by Engine now, overwriting UI timeout
        actionBtn.disabled = true;
        actionBtn.classList.remove('start', 'cashout'); // Reset styles
        actionBtn.style.background = 'linear-gradient(135deg, #555, #333)'; // Grey out
        if (btnText) btnText.textContent = "ROLLING...";
        if (btnSubtext) btnSubtext.textContent = "Good Luck!";

        statusText.textContent = "Spinning...";
        statusText.style.color = "#fff";
        resultAmount.classList.remove('highlight');
        resultAmount.textContent = "$0.00";
        break;

      case 'WIN':
        const winAmount = data;
        actionBtn.disabled = false;
        actionBtn.style.background = ''; // Reset to CSS default
        if (btnText) btnText.textContent = "SPIN AGAIN";
        if (btnSubtext) btnSubtext.textContent = "Press to Roll";

        statusText.textContent = "WIN!";
        statusText.style.color = "#00ff90";

        resultAmount.textContent = `$${formatChips(winAmount)}`;
        resultAmount.classList.add('highlight');
        // Add a little CSS shake or glow here if desired
        break;

      case 'LOSE':
        actionBtn.disabled = false;
        actionBtn.style.background = '';
        if (btnText) btnText.textContent = "SPIN";
        if (btnSubtext) btnSubtext.textContent = "Press to Roll";

        statusText.textContent = "Try Again";
        statusText.style.color = "#aaa";
        break;
    }
  }

  // ================= GAME LOGIC: REELS =================
  class Reel {
    constructor(x, idx) {
      this.x = x; this.idx = idx;
      this.pos = 0; this.speed = 0; this.target = null;
      this.stopping = false; this.settled = false; this.blur = 0;
    }
    start() {
      this.speed = 45 + Math.random() * 15; // Faster start
      this.stopping = false; this.settled = false; this.blur = 0;
    }
    stop(finalSymbols) {
      this.target = finalSymbols;
      this.stopping = true;
    }
    update(spinning) {
      if (!spinning) return;

      this.pos += this.speed;
      const band = SYMBOL_SIZE + GAP;

      // Wrap around
      if (this.pos >= band) this.pos -= band;

      // Stop logic
      if (this.stopping && !this.settled) {
        this.speed *= 0.90; // Smoother deceleration
        if (this.speed < 20) this.speed *= 0.85; // Snap at end

        if (this.speed < 0.5) {
          this.speed = 0;
          this.settled = true;
          this.pos = 0;
        }
      }
      this.blur = Math.min(this.speed / 8, 5);
    }
    draw(ctx, symbols, glow) {
      const yOffset = -this.pos; // Shift up based on position

      // Draw 1 extra row above and below for seamless scrolling
      for (let i = -1; i < ROWS + 1; i++) {
        let imgData, isWin = false;

        if (this.settled && this.target) {
          // Logic to pick the correct target symbol for the visible rows
          // We map the visual row index (i) to the data index
          if (i >= 0 && i < ROWS) {
            const s = this.target[i];
            const match = symbols.find(x => x.file === s.file);
            imgData = match ? match.img : (symbols[0] && symbols[0].img);
            if (s.win) isWin = true;
          } else {
            // Random symbols for padding rows
            imgData = (symbols[Math.floor(Math.random() * symbols.length)] || {}).img;
          }
        } else {
          // Random symbols while spinning
          imgData = (symbols[Math.floor(Math.random() * symbols.length)] || {}).img;
        }

        const y = yOffset + i * (SYMBOL_SIZE + GAP) + GAP / 2;

        // Skip drawing if significantly off screen
        if (y < -SYMBOL_SIZE || y > CANVAS_HEIGHT) continue;

        ctx.save();
        // Draw Symbol
        if (this.blur > 0) {
          ctx.filter = `blur(${this.blur}px)`;
        }
        if (imgData) ctx.drawImage(imgData, this.x, y, SYMBOL_SIZE, SYMBOL_SIZE);

        // Draw Win Box
        if (isWin && glow && this.blur === 0) {
          ctx.filter = 'none';
          const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 100);
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
          ctx.lineWidth = 5;
          ctx.shadowColor = "#ffea00";
          ctx.shadowBlur = 20;
          ctx.strokeRect(this.x + 4, y + 4, SYMBOL_SIZE - 8, SYMBOL_SIZE - 8);
        }
        ctx.restore();
      }
    }
  }

  // ================= ENGINE LOOP =================
  const reels = [];
  let spinning = false;
  let glowing = false;
  let particles = [];
  let bonusMarkers = [];

  // --- Particles ---
  const createParticles = (count = 25, colorFn) => {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * CANVAS_WIDTH,
        y: CANVAS_HEIGHT,
        size: Math.random() * 4 + 2,
        speedY: 2 + Math.random() * 4,
        speedX: (Math.random() - 0.5) * 2,
        alpha: 1,
        color: colorFn ? colorFn() : `rgba(255,215,0,1)`,
      });
    }
  };

  const drawParticles = (ctx) => {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      p.y -= p.speedY;
      p.x += p.speedX;
      p.alpha -= 0.015;
    });
    particles = particles.filter(p => p.alpha > 0);
  };

  // --- Background ---
  function drawBackground(ctx) {
    // Clean dark background to match glassmorphism
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Subtle Gradient
    const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    g.addColorStop(0, '#0a0f1f');
    g.addColorStop(1, '#050810');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid Lines (Vertical)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    for (let i = 1; i < REELS; i++) {
      const x = i * (SYMBOL_SIZE + GAP) - GAP / 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
  }

  // --- Main Draw ---
  function draw() {
    drawBackground(ctx);
    reels.forEach(r => {
      r.update(spinning);
      r.draw(ctx, loadedSymbols, glowing);
    });

    // Bonus Text Markers
    bonusMarkers = bonusMarkers.filter(b => b.ms > 0);
    bonusMarkers.forEach(b => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(1, b.ms / 500)})`;
      ctx.font = 'bold 30px Poppins, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;

      const x = b.x * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;
      const y = b.y * (SYMBOL_SIZE + GAP) + SYMBOL_SIZE / 2;

      // Float up effect
      const floatY = y - (2000 - b.ms) * 0.05;

      ctx.fillText(b.text, x, floatY);
      ctx.restore();
      b.ms -= 16;
    });

    if (glowing && particles.length) drawParticles(ctx);

    if (spinning || glowing || bonusMarkers.length || particles.length) {
      requestAnimationFrame(draw);
    }
  }

  function init() {
    for (let i = 0; i < REELS; i++) {
      reels.push(new Reel(i * (SYMBOL_SIZE + GAP), i));
    }
    draw();
  }

  // ================= ACTIONS =================
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

  async function startSpin() {
    if (spinning || glowing) return;

    // 1. Validation
    let bet = parseFloat(hiddenBetInput.value) || cfg.minBet;
    if (bet > currentBalance) {
      if (statusText) { statusText.textContent = "No Funds!"; statusText.style.color = "#ff4b4b"; }
      return;
    }

    // 2. UI Setup
    updateUIState('SPINNING');

    // Optimistic balance update
    currentBalance -= bet;
    if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

    try {
      // 3. Server Call
      const data = await fetchServerSpin(bet);
      const finalSymbols = data.finalSymbols;

      // 4. Start Animation
      spinning = true;
      reels.forEach(r => r.start());
      draw();

      // 5. Staggered Stop (Classic casino feel)
      reels.forEach((r, i) => {
        setTimeout(() => r.stop(finalSymbols[i]), 1000 + (i * 300));
      });

      // 6. End Sequence
      // Calculate when the last reel stops
      const totalAnimationTime = 1000 + (REELS * 300) + 800; // +800 for settling buffer

      setTimeout(() => {
        spinning = false;

        // Sync exact server balance
        currentBalance = data.balance;
        if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);

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

        if (bonusAdded > 0) {
          currentBalance += bonusAdded;
          if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);
        }

        // WIN or LOSE
        if (data.winnings > 0) {
          glowing = true;
          updateUIState('WIN', data.winnings);

          // Burst Particles
          createParticles(50, () => `rgba(255, 215, 0, 1)`); // Gold
          createParticles(20, () => `rgba(255, 255, 255, 0.8)`); // Sparkles
          draw();

          // Stop glowing after a few seconds
          setTimeout(() => { glowing = false; }, 3000);
        } else {
          updateUIState('LOSE');
        }

      }, totalAnimationTime);

    } catch (err) {
      console.error(err);
      alert("Spin failed: " + err.message);
      // Refund on error
      currentBalance += bet;
      if (balanceDisplay) balanceDisplay.textContent = formatChips(currentBalance);
      updateUIState('LOSE'); // Reset UI
    }
  }

  // Listener on the HIDDEN button (Triggered by the visible Action Button in slotsUI.js)
  if (hiddenSpinBtn) {
    hiddenSpinBtn.addEventListener('click', (e) => {
      // Prevent double clicks if engine is already running
      if (!spinning) startSpin();
    });
  }

})();