import slotsConfig from './slotsConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  const slotType = 'SlotsClassic';
  const config = slotsConfig[slotType];

  const reelsContainer = document.getElementById('reels');
  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const resultDisplay = document.getElementById('result');

  const reels = [];
  const reelImgs = [];

  const getRandomSymbol = () => {
    const weighted = [];
    config.symbols.forEach(sym => {
      const weight = config.symbolChances[sym.name] || 1;
      for (let i = 0; i < weight; i++) weighted.push(sym);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  };

  for (let r = 0; r < config.reels; r++) {
    const col = document.createElement('div');
    col.classList.add('reel-col');
    const imgs = [];
    for (let row = 0; row < config.rows + 6; row++) { // extra symbols for smooth spin
      const img = document.createElement('img');
      img.src = getRandomSymbol().file; // populate initially
      img.classList.add('reel-img');
      col.appendChild(img);
      imgs.push(img);
    }
    reelsContainer.appendChild(col);
    reels.push(col);
    reelImgs.push(imgs);
  }

  const spinReels = () => {
    const bet = parseInt(betInput.value);
    if (!bet || bet < 1) { alert('Enter valid bet!'); return; }
    if (bet > parseInt(balanceDisplay.textContent)) { alert('Not enough chips!'); return; }

    spinBtn.disabled = true;
    resultDisplay.textContent = '';
    const finalSymbols = [];

    // Deduct bet immediately
    balanceDisplay.textContent = parseInt(balanceDisplay.textContent) - bet;

    // Start fast spinning animation
    reels.forEach((col, colIdx) => {
      reelImgs[colIdx].forEach(img => img.style.transition = 'transform 0.05s linear');
    });

    // Generate final symbols for each reel
    for (let c = 0; c < config.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < config.rows; r++) {
        colSymbols.push(getRandomSymbol());
      }
      finalSymbols.push(colSymbols);
    }

    // Spin and settle each reel individually
    reels.forEach((col, colIdx) => {
      const imgs = reelImgs[colIdx];
      let spinCount = 0;
      const maxSpin = 20 + colIdx * 5; // staggered stop

      const spinInterval = setInterval(() => {
        imgs.forEach(img => img.src = getRandomSymbol().file);
        spinCount++;
        if (spinCount >= maxSpin) {
          clearInterval(spinInterval);
          // Settle final symbols
          imgs.forEach((img, rowIdx) => {
            img.style.transition = 'transform 1s cubic-bezier(0.25, 0.1, 0.25, 1)';
            img.src = finalSymbols[colIdx][rowIdx].file;
          });
        }
      }, 50); // fast initial spin
    });

    // Evaluate win after longest reel stop
    setTimeout(() => {
      const winnings = calculateWinnings(finalSymbols, bet);
      if (winnings > 0) {
        balanceDisplay.textContent = parseInt(balanceDisplay.textContent) + winnings;
        resultDisplay.textContent = `🎉 You won ${winnings} Chips!`;
      } else {
        resultDisplay.textContent = '😢 No win, try again!';
      }
      spinBtn.disabled = false;
    }, 3000 + config.reels * 200); // wait enough for all reels to settle
  };

  const calculateWinnings = (symbolsMatrix, bet) => {
    let totalWin = 0;
    config.paylines.forEach(line => {
      const first = symbolsMatrix[0][line[0]];
      const win = line.every((rowIdx, colIdx) => symbolsMatrix[colIdx][rowIdx].name === first.name);
      if (win) totalWin += bet * first.multiplier;
    });
    return totalWin;
  };

  spinBtn.addEventListener('click', spinReels);
});
