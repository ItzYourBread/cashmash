// public/js/slots.js (Client-Side Final)

// NOTE: Ensure your server environment uses 'module.exports' for slotsConfig.js
// and that this client file is loaded with type="module" if using ES modules.

document.addEventListener('DOMContentLoaded', () => {
  const REEL_STOP_DURATION = 1000;
  const INTERVAL_TIME = 50;
  const BASE_SPIN_COUNT = 30;
  const SPIN_COUNT_STAGGER = 8;
  const REELS = 5;
  const ROWS = 4;

  const reelsContainer = document.getElementById('reels');
  const spinBtn = document.getElementById('spinBtn');
  const balanceDisplay = document.getElementById('balance');
  const betInput = document.getElementById('betAmount');
  const resultDisplay = document.getElementById('result');

  // Win message element
  const winMessageEl = document.createElement('div');
  winMessageEl.id = 'winMessage';
  winMessageEl.classList.add('win-message');
  reelsContainer.appendChild(winMessageEl);

  let currentBalance = parseInt(balanceDisplay.textContent, 10) || 0;
  balanceDisplay.textContent = currentBalance;

  const reels = [];
  const reelImgs = [];

  // Canvas Overlay Setup
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
  window.addEventListener('load', resizeCanvas); // Ensure sizing on load

  // Initialize visible slots
  for (let r = 0; r < REELS; r++) {
    const col = document.createElement('div');
    col.classList.add('reel-col');
    const imgs = [];
    for (let row = 0; row < ROWS; row++) {
      const img = document.createElement('img');
      img.src = '/images/ClassicSlot/cherry.png'; // initial placeholder
      img.classList.add('reel-img');
      col.appendChild(img);
      imgs.push(img);
    }
    reelsContainer.appendChild(col);
    reels.push(col);
    reelImgs.push(imgs);
  }

  // --- Core Server Communication ---
  const serverSpin = async (bet) => {
    const res = await fetch('/slots/spin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown' }));
      throw new Error(err.error || 'Spin failed');
    }
    return res.json();
  };

  // --- Core Spin Function ---
  const spinReels = async () => {
    const bet = parseInt(betInput.value, 10);
    if (!bet || bet < 1) return alert('Enter valid bet!');
    if (bet > currentBalance) return alert('Not enough chips!');

    spinBtn.disabled = true;
    resultDisplay.textContent = '';
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);
    reels.forEach(col => col.classList.remove('win'));
    winMessageEl.style.animation = 'none';

    // Deduct locally
    currentBalance -= bet;
    balanceDisplay.textContent = currentBalance;

    try {
      const data = await serverSpin(bet);
      const finalSymbols = data.finalSymbols;

      // High-Frequency Flicker Pool (The Illusion)
      const highFrequencyFiles = [
        '/images/ClassicSlot/cherry.png',
        '/images/ClassicSlot/lemon.png',
        '/images/ClassicSlot/orange.png',
        '/images/ClassicSlot/watermelon.png'
      ];
      // Weighted pool: 4 copies of common symbols + 1 copy of high value symbols
      const flickerPool = [...highFrequencyFiles, ...highFrequencyFiles, ...highFrequencyFiles, ...highFrequencyFiles];
      const highValueFiles = finalSymbols.flat().filter(s => s.multiplier >= 4).map(s => s.file);
      highValueFiles.forEach(file => flickerPool.push(file));


      reels.forEach((col, colIdx) => {
        const imgs = reelImgs[colIdx];
        let spinCount = 0;
        const maxSpin = BASE_SPIN_COUNT + colIdx * SPIN_COUNT_STAGGER;

        imgs.forEach(img => (img.style.transition = 'none'));

        const spinInterval = setInterval(() => {
          // Flicker effect using the weighted pool
          imgs.forEach(img => {
            img.src = flickerPool[Math.floor(Math.random() * flickerPool.length)];
          });

          spinCount++;

          if (spinCount >= maxSpin) {
            clearInterval(spinInterval);
            // Set final images from server result (The TRUE result)
            imgs.forEach((img, rowIdx) => {
              const serverSym = finalSymbols[colIdx][rowIdx];
              // Optional: Add a transition back if you want a subtle landing effect
              img.style.transition = 'transform 400ms cubic-bezier(.25,.1,.25,1)';
              img.src = serverSym.file;
            });
          }
        }, INTERVAL_TIME);
      });

      // --- Post-Spin Resolution ---
      const maxSpinTime = (BASE_SPIN_COUNT + (REELS - 1) * SPIN_COUNT_STAGGER) * INTERVAL_TIME;
      const finalDelay = maxSpinTime + REEL_STOP_DURATION;

      setTimeout(() => {
        currentBalance = data.balance;
        balanceDisplay.textContent = currentBalance;

        if (data.winnings > 0) {
          resultDisplay.textContent = `🎉 You won ${data.winnings} Chips!`;
          drawWinningLines(data.winningLines);
          const winType = getWinType(data.winnings, bet);
          showWinMessage(winType);
        } else {
          resultDisplay.textContent = '😢 Loss';
        }

        spinBtn.disabled = false;
      }, finalDelay + 50);

    } catch (err) {
      console.error(err);
      currentBalance = parseInt(balanceDisplay.textContent, 10) + bet;
      balanceDisplay.textContent = currentBalance;
      alert(err.message || 'Spin error');
      spinBtn.disabled = false;
    }
  };

  // --- Drawing and FX Helpers ---
  const drawWinningLines = (winningLines) => {
    resizeCanvas();
    ctx.clearRect(0, 0, winCanvas.width, winCanvas.height);
    const reelCols = document.querySelectorAll('.reel-col');
    if (!reelCols.length) return;
    const imgHeight = reelCols[0].querySelector('.reel-img').offsetHeight;
    const gap = parseInt(getComputedStyle(reelCols[0]).gap, 10) || 8;
    const containerRect = reelsContainer.getBoundingClientRect();

    ctx.lineWidth = 4;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FFD700';
    ctx.strokeStyle = '#FFD700';

    winningLines.forEach(line => {
      ctx.beginPath();
      line.forEach((rowIdx, colIdx) => {
        const colElement = reelCols[colIdx];
        const colRect = colElement.getBoundingClientRect();
        
        // X coordinate: Column center, relative to container
        const x = (colRect.left - containerRect.left) + (colRect.width / 2);
        
        // Y coordinate: Row center, adjusted for container/image start
        const y = (rowIdx * (imgHeight + gap)) + (imgHeight / 2) + gap / 2;
        
        if (colIdx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  };

  const getWinType = (winnings, bet) => {
    if (winnings >= bet * 100) return 'JACKPOT!';
    if (winnings >= bet * 50) return 'MEGA WIN';
    if (winnings >= bet * 20) return 'EPIC WIN';
    if (winnings >= bet * 5) return 'SUPER WIN';
    if (winnings > 0) return 'WIN';
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

  const createConfetti = (count = 12) => {
    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.classList.add('confetti');
      const rect = reelsContainer.getBoundingClientRect();
      const x = Math.random() * rect.width;
      confetti.style.left = `${x}px`;
      confetti.style.top = `${Math.random() * 20}px`;
      confetti.style.background = `hsl(${Math.random() * 50 + 45}, 100%, 50%)`;
      reelsContainer.appendChild(confetti);
      confetti.addEventListener('animationend', () => confetti.remove());
    }
  };

  spinBtn.addEventListener('click', spinReels);
});