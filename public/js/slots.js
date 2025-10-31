document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('slotCanvas');
  const ctx = canvas.getContext('2d');

  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const resultDisplay = document.getElementById('result');

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


  // Adjusted width to include the offset
  const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) + -4 * 2;
  const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) + -4 * 2;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // NOTE: Initial balance should ideally be loaded from the server
  let currentBalance = parseInt(balanceDisplay.textContent, 10) || 1000;
  balanceDisplay.textContent = currentBalance;

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
    // Store image object AND the associated file path for easy lookup
    loadedSymbols.push({ img, file: s.file });
  });

  // --- SERVER COMMUNICATION ---

  /**
   * Sends the bet to the server and fetches the authoritative spin result.
   */
  const actualServerSpin = async (bet) => {
    const response = await fetch('/slots/spin', { // IMPORTANT: Check this is your correct endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ADD AUTHORIZATION HEADER HERE (e.g., 'Authorization: Bearer <token>')
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
      this.target = null; // Final 4 symbols from server for this reel
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
          // Use the visible part of the target array (which should be 4 symbols long)
          const idx = i % ROWS;
          const symbolData = this.target[idx]; // { name: '...', file: '...', win: true }

          // Find the preloaded image object using the file path
          const match = loadedSymbols.find(s => s.file === symbolData.file);
          imgData = match ? match.img : loadedSymbols[0].img;

          // Check if the symbol object has the `win: true` flag set (server-determined)
          if (symbolData.win) {
            isWinningSymbol = true;
          }

        } else {
          // During spin, pick a random loaded image for the animation
          imgData = loadedSymbols[Math.floor(Math.random() * loadedSymbols.length)].img;
        }

        const y = yOffset + i * (SYMBOL_SIZE + GAP);

        // --- DRAWING LOGIC ---
        ctx.save();

        if (isWinningSymbol && glowing) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'gold';
        } else {
          ctx.filter = this.blur > 0 ? `blur(${this.blur}px) brightness(${1 + this.blur * 0.05})` : 'none';
        }

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
    const bet = parseInt(betInput.value, 10) || 1;
    if (bet <= 0) return alert('Enter a valid bet!');
    if (bet > currentBalance) return alert('Not enough chips!');

    resultDisplay.textContent = '';
    spinBtn.disabled = true;

    // Optimistic balance update
    currentBalance -= bet;
    balanceDisplay.textContent = currentBalance;

    try {
      // Call the actual server function
      const data = await actualServerSpin(bet);

      // finalSymbols is the 5x4 grid, with win: true/false flags
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
        balanceDisplay.textContent = currentBalance;

        if (data.winnings > 0) {
          resultDisplay.textContent = `🎉 You won ${data.winnings.toFixed(2)} chips!`;

          // START GLOW ANIMATION
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
        resultDisplay.textContent = '😢 No win this time!';
        spinBtn.disabled = false;

      }, stopTime);

    } catch (err) {
      console.error(err);
      alert(err.message || 'Spin error');
      // Revert balance if the spin failed
      currentBalance += bet;
      balanceDisplay.textContent = currentBalance;
      spinBtn.disabled = false;
    }
  };

  spinBtn.addEventListener('click', startSpin);
});