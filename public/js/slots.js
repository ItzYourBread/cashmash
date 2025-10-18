// slots.js - FULL VERSION

import slotsConfig from './slotsConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  const slotType = 'SlotsClassic';
  const config = slotsConfig[slotType];

  const REEL_STOP_DURATION = 1000;
  const INTERVAL_TIME = 50;
  const BASE_SPIN_COUNT = 30;
  const SPIN_COUNT_STAGGER = 8;

  const reelsContainer = document.getElementById('reels');
  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const resultDisplay = document.getElementById('result');
  const winMessageEl = document.createElement('div');
  winMessageEl.id = 'winMessage';
  winMessageEl.classList.add('win-message');
  reelsContainer.parentElement.insertBefore(winMessageEl, reelsContainer);

  let currentBalance = parseInt(balanceDisplay.textContent) || 1000;
  balanceDisplay.textContent = currentBalance;

  const reels = [];
  const reelImgs = [];

  // Canvas overlay for winning lines
  const winCanvas = document.createElement('canvas');
  winCanvas.classList.add('win-lines');
  reelsContainer.insertBefore(winCanvas, reelsContainer.firstChild);
  const ctx = winCanvas.getContext('2d');

  const resizeCanvas = () => {
    winCanvas.width = reelsContainer.offsetWidth;
    winCanvas.height = reelsContainer.offsetHeight;
    winCanvas.style.position = 'absolute';
    winCanvas.style.top = '0';
    winCanvas.style.left = '0';
    winCanvas.style.pointerEvents = 'none';
  };
  window.addEventListener('resize', resizeCanvas);

  const getRandomSymbol = () => {
    const weighted = [];
    config.symbols.forEach(sym => {
      const weight = config.symbolChances?.[sym.name] || 1;
      for (let i = 0; i < weight; i++) weighted.push(sym);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  };

  // Initialize reels
  for (let r = 0; r < config.reels; r++) {
    const col = document.createElement('div');
    col.classList.add('reel-col');
    const imgs = [];
    for (let row = 0; row < config.rows; row++) {
      const img = document.createElement('img');
      img.src = getRandomSymbol().file;
      img.classList.add('reel-img');
      col.appendChild(img);
      imgs.push(img);
    }
    reelsContainer.appendChild(col);
    reels.push(col);
    reelImgs.push(imgs);
  }

  resizeCanvas();

  const spinReels = () => {
    const bet = parseInt(betInput.value);
    if (!bet || bet < 1) return alert('Enter valid bet!');
    if (bet > currentBalance) return alert('Not enough chips!');

    spinBtn.disabled = true;
    resultDisplay.textContent = '';
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);
    reels.forEach(col => col.classList.remove('win'));

    currentBalance -= bet;
    balanceDisplay.textContent = currentBalance;

    const finalSymbols = [];
    for (let c = 0; c < config.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < config.rows; r++) colSymbols.push(getRandomSymbol());
      finalSymbols.push(colSymbols);
    }

    // Spin animation
    reels.forEach((col, colIdx) => {
      const imgs = reelImgs[colIdx];
      let spinCount = 0;
      const maxSpin = BASE_SPIN_COUNT + colIdx * SPIN_COUNT_STAGGER;

      imgs.forEach(img => img.style.transition = 'none');

      const spinInterval = setInterval(() => {
        imgs.forEach(img => img.src = getRandomSymbol().file);
        spinCount++;
        if (spinCount >= maxSpin) {
          clearInterval(spinInterval);
          imgs.forEach((img, rowIdx) => img.src = finalSymbols[colIdx][rowIdx].file);
        }
      }, INTERVAL_TIME);
    });

    const maxSpinTime = (BASE_SPIN_COUNT + (config.reels - 1) * SPIN_COUNT_STAGGER) * INTERVAL_TIME;
    const finalDelay = maxSpinTime + REEL_STOP_DURATION;

    setTimeout(() => {
      const winningLines = [];
      const winnings = calculateWinnings(finalSymbols, bet, winningLines);

      currentBalance += winnings;
      balanceDisplay.textContent = currentBalance;

      if (winnings > 0) {
        resultDisplay.textContent = `🎉 You won ${winnings} Chips!`;
        drawWinningLines(winningLines);
        const winType = getWinType(winnings, bet);
        showWinMessage(winType);
      } else {
        resultDisplay.textContent = '😢 No win, try again!';
      }
      spinBtn.disabled = false;
    }, finalDelay);
  };

  const calculateWinnings = (symbolsMatrix, bet, winningLines = []) => {
    let totalWin = 0;
    config.paylines.forEach(line => {
      const first = symbolsMatrix[0][line[0]];
      const isWin = line.every((rowIdx, colIdx) => symbolsMatrix[colIdx][rowIdx].name === first.name);
      if (isWin) {
        totalWin += bet * first.multiplier;
        winningLines.push(line);
        reels.forEach(col => col.classList.add('win'));
      }
    });
    return totalWin;
  };

  const drawWinningLines = (winningLines) => {
    resizeCanvas();
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);
    const reelCols = document.querySelectorAll('.reel-col');
    if (!reelCols.length) return;
    const imgHeight = reelCols[0].querySelector('.reel-img').offsetHeight;
    const imgWidth = reelCols[0].querySelector('.reel-img').offsetWidth;
    const gap = 8;

    ctx.lineWidth = 4;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FFD700';
    ctx.strokeStyle = '#FFD700';

    winningLines.forEach(line => {
      ctx.beginPath();
      line.forEach((rowIdx, colIdx) => {
        const colElement = reelCols[colIdx];
        const colRect = colElement.getBoundingClientRect();
        const containerRect = reelsContainer.getBoundingClientRect();
        const x = (colRect.left - containerRect.left) + (colRect.width / 2);
        const y = (rowIdx * (imgHeight + gap)) + (imgHeight / 2) + gap / 2;
        if (colIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  const getWinType = (winnings, bet) => {
    if (winnings >= bet * 100) return 'Jackpot!';
    if (winnings >= bet * 50) return 'Mega Win';
    if (winnings >= bet * 20) return 'Epic Win';
    if (winnings >= bet * 5) return 'Super Win';
    if (winnings > 0) return 'Win';
    return '';
  };

  const showWinMessage = (text) => {
    winMessageEl.textContent = text;
    winMessageEl.style.animation = 'winFadeIn 0.8s forwards';
    createConfetti(25);

    setTimeout(() => {
      winMessageEl.style.animation = 'winFadeOut 1s forwards';
    }, 3000);
  };

  const createConfetti = (count = 10) => {
    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.classList.add('confetti');
      confetti.style.left = `${50 + Math.random() * 200 - 100}px`;
      confetti.style.top = '0px';
      confetti.style.background = `hsl(${Math.random() * 50 + 45}, 100%, 50%)`;
      reelsContainer.appendChild(confetti);
      confetti.addEventListener('animationend', () => confetti.remove());
    }
  };

  spinBtn.addEventListener('click', spinReels);
});
