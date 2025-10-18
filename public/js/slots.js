// slots.js - FINAL (Restored Random Cycling Spin Style)

import slotsConfig from './slotsConfig.js';

document.addEventListener('DOMContentLoaded', () => {
  const slotType = 'SlotsClassic';
  const config = slotsConfig[slotType];

  // Constants
  const REEL_STOP_DURATION = 1000; // CSS transition duration for final stop
  const INTERVAL_TIME = 50;       // Speed of image cycling (50ms)
  const BASE_SPIN_COUNT = 30;     // Base number of cycles for the first reel
  const SPIN_COUNT_STAGGER = 8;   // Extra cycles for each subsequent reel

  const reelsContainer = document.getElementById('reels');
  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const resultDisplay = document.getElementById('result');

  let currentBalance = parseInt(balanceDisplay.textContent) || 1000;
  balanceDisplay.textContent = currentBalance;

  const reels = [];
  const reelImgs = [];

  // --- Canvas Overlay Setup ---
  const winCanvas = document.createElement('canvas');
  winCanvas.classList.add('win-lines');
  reelsContainer.insertBefore(winCanvas, reelsContainer.firstChild); // Place canvas first
  const ctx = winCanvas.getContext('2d');

  const resizeCanvas = () => {
    // Canvas must match the size of its parent (.reels)
    winCanvas.width = reelsContainer.offsetWidth;
    winCanvas.height = reelsContainer.offsetHeight;
    // Set position to overlay exactly on the reels area
    winCanvas.style.position = 'absolute';
    winCanvas.style.top = '0';
    winCanvas.style.left = '0';
    winCanvas.style.pointerEvents = 'none'; // Ensure clicks go to the button
  };
  window.addEventListener('resize', resizeCanvas);

  const getRandomSymbol = () => {
    const weighted = [];
    config.symbols.forEach(sym => {
      const weight = config.symbolChances[sym.name] || 1;
      for (let i = 0; i < weight; i++) weighted.push(sym);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  };

  // Initialize reels
  for (let r = 0; r < config.reels; r++) {
    const col = document.createElement('div');
    col.classList.add('reel-col');
    const imgs = [];
    // Only need symbols for the visible area + 1 or 2, as we are swapping sources, not translating
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

  resizeCanvas(); // Initial canvas sizing

  const spinReels = () => {
    const bet = parseInt(betInput.value);
    if (!bet || bet < 1) return alert('Enter valid bet!');
    if (bet > currentBalance) return alert('Not enough chips!');

    spinBtn.disabled = true;
    resultDisplay.textContent = '';
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);
    reels.forEach(col => col.classList.remove('win')); // Clear previous highlights

    currentBalance -= bet;
    balanceDisplay.textContent = currentBalance;
    
    const finalSymbols = [];
    // 1. Determine all final symbols first
    for (let c = 0; c < config.reels; c++) {
      const colSymbols = [];
      for (let r = 0; r < config.rows; r++) {
        colSymbols.push(getRandomSymbol());
      }
      finalSymbols.push(colSymbols);
    }

    // 2. Start the spinning animation for each reel
    reels.forEach((col, colIdx) => {
      const imgs = reelImgs[colIdx];
      let spinCount = 0;
      const maxSpin = BASE_SPIN_COUNT + colIdx * SPIN_COUNT_STAGGER;
      let spinInterval;

      // Ensure no CSS transition is active during the spin
      imgs.forEach(img => img.style.transition = 'none'); 

      spinInterval = setInterval(() => {
        // Cycle all visible images to a new random symbol
        imgs.forEach(img => (img.src = getRandomSymbol().file));
        spinCount++;
        
        // Stop condition for this reel
        if (spinCount >= maxSpin) {
          clearInterval(spinInterval);
          
          // Apply final symbols and initiate the CSS transition (even if transform is 0)
          imgs.forEach((img, rowIdx) => {
            img.src = finalSymbols[colIdx][rowIdx].file;
            // The spin animation is now only visual cycling, no transform needed for this style
          });
        }
      }, INTERVAL_TIME);
    });

    // 3. Schedule win calculation and button re-enable after all reels have stopped
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
      } else {
        resultDisplay.textContent = '😢 No win, try again!';
      }
      spinBtn.disabled = false;
    }, finalDelay);
  };

  const calculateWinnings = (symbolsMatrix, bet, winningLines = []) => {
    let totalWin = 0;
    config.paylines.forEach((line) => {
      const first = symbolsMatrix[0][line[0]];
      const isWin = line.every((rowIdx, colIdx) => symbolsMatrix[colIdx][rowIdx].name === first.name);
      
      if (isWin) {
        totalWin += bet * first.multiplier;
        winningLines.push(line);
        // Highlight reels on win
        reels.forEach(col => col.classList.add('win'));
      }
    });
    return totalWin;
  };

  // Robust drawing function for the canvas
  const drawWinningLines = (winningLines) => {
    resizeCanvas();
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);

    // Get true position/size data from the DOM
    const reelCols = document.querySelectorAll('.reel-col');
    if (reelCols.length === 0) return;

    // Assuming all reel columns and images are the same size
    const reelRect = reelCols[0].getBoundingClientRect();
    const reelContainerRect = reelsContainer.getBoundingClientRect();
    const imgHeight = reelCols[0].querySelector('.reel-img').offsetHeight;
    const imgWidth = reelCols[0].querySelector('.reel-img').offsetWidth;
    const gap = 8; // Based on slots.css

    ctx.lineWidth = 4;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FFD700';
    ctx.strokeStyle = '#FFD700';

    winningLines.forEach((line) => {
      ctx.beginPath();
      line.forEach((rowIdx, colIdx) => {
        const colElement = reelCols[colIdx];
        const colRect = colElement.getBoundingClientRect();

        // X coordinate: (Col start X - Container start X) + (Image width / 2)
        // We use the column's offset, not just image width * index
        const x = (colRect.left - reelContainerRect.left) + (colRect.width / 2);
        
        // Y coordinate: (Row index * (Image height + Gap)) + (Image height / 2)
        // We assume symbols start at the top of the viewport
        const y = (rowIdx * (imgHeight + gap)) + (imgHeight / 2) + (gap / 2); // added gap/2 for vertical centering adjustment

        if (colIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  spinBtn.addEventListener('click', spinReels);
});