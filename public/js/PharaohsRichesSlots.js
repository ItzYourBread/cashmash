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

  const CANVAS_WIDTH = REELS * (SYMBOL_SIZE + GAP) - 8;
  const CANVAS_HEIGHT = ROWS * (SYMBOL_SIZE + GAP) - 8;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  let currentBalance = parseInt(balanceDisplay.textContent, 10) || 1000;
  balanceDisplay.textContent = currentBalance;

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

    currentBalance -= bet;
    balanceDisplay.textContent = currentBalance;

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
        balanceDisplay.textContent = currentBalance;

        if (data.winnings > 0) {
          resultDisplay.textContent = `🎉 You won ${data.winnings.toFixed(2)} chips!`;
          glowing = true;
          draw();
          setTimeout(() => {
            glowing = false;
            spinBtn.disabled = false;
          }, 3000);
          return;
        }

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
