document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  // ====================== UTILITY ======================
  const formatChips = (amount) => {
    if (amount === null || amount === undefined) return '0.00';

    const num = Number(amount);
    if (isNaN(num)) return '0.00';

    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };


  // ====================== DOM ELEMENTS ======================
  // Main UI
  const balanceEl = document.getElementById('balance');
  const flightArea = document.getElementById('flightArea');
  const multiplierDisplay = document.getElementById('multiplierDisplay');
  const gameStatusText = document.getElementById('gameStatusText');
  const progressBarContainer = document.getElementById('progressBarContainer');
  const progressBar = document.getElementById('progressBar');
  const historyRibbon = document.getElementById('historyRibbon');
  const popupMessage = document.getElementById('popupMessage');

  // Graph Elements
  const graphSvgEl = document.getElementById('graph-svg');
  const planeEl = document.getElementById('plane');
  const graphPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');

  // Control Dock
  const actionBtn = document.getElementById('actionBtn');
  const btnText = document.getElementById('btnText');
  const btnSubtext = document.getElementById('btnSubtext');
  const openBetModalBtn = document.getElementById('openBetModalBtn');
  const openAutoModalBtn = document.getElementById('openAutoModalBtn');
  const displayBetValue = document.getElementById('displayBetValue');
  const displayAutoValue = document.getElementById('displayAutoValue');

  // Modals
  const betModal = document.getElementById('betModal');
  const autoModal = document.getElementById('autoModal');
  const modalBetInput = document.getElementById('modalBetInput');
  const modalAutoInput = document.getElementById('modalAutoInput');
  const confirmBetBtn = document.getElementById('confirmBet');
  const confirmAutoBtn = document.getElementById('confirmAuto');
  const disableAutoBtn = document.getElementById('disableAuto');
  const chipBtns = document.querySelectorAll('.chip-btn');
  const autoBtns = document.querySelectorAll('.auto-btn');
  const closeModalBtns = document.querySelectorAll('.close-modal');

  // ====================== STATE ======================
  let userBalance = parseFloat(balanceEl.dataset.rawBalance) || 0;
  let userId = null;
  if (window.user && window.user._id) userId = String(window.user._id);

  // Game State
  let currentMultiplier = 1.0;
  let gameState = 'WAITING'; // WAITING, BETTING, FLYING, CRASHED
  let flightAnimInterval = null;
  let points = [];

  // User State
  let currentBetAmount = 1;
  let nextRoundBet = false; // If user clicks bet during flight
  let hasActiveBet = false; // Bet accepted by server for CURRENT round
  let hasCashedOut = false;

  // Auto Cashout
  let autoCashoutEnabled = false;
  let autoCashoutValue = 2.00;

  const MIN_BET = 1;
  const MAX_BET = 100;

  // Initialize Balance
  balanceEl.textContent = formatChips(userBalance);

  // Setup SVG
  if (graphSvgEl) {
    graphPathEl.setAttribute('class', 'flight-line');
    graphSvgEl.appendChild(graphPathEl);
  }

  // ====================== UI HELPERS ======================

  const showPopup = (msg) => {
    popupMessage.textContent = msg;
    popupMessage.classList.add('show');
    setTimeout(() => popupMessage.classList.remove('show'), 2500);
  };

  const updateActionButton = (state, subtextOverride = null) => {
    // Reset classes
    actionBtn.className = 'btn-action';
    actionBtn.disabled = false;

    if (state === 'BET') {
      actionBtn.classList.add('bet');
      btnText.textContent = "PLACE BET";
      btnSubtext.textContent = subtextOverride || "Next Round";
    }
    else if (state === 'CASHOUT') {
      actionBtn.classList.add('cashout');
      btnText.textContent = "CASH OUT";
      // Calculate potential win
      const win = currentBetAmount * currentMultiplier;
      btnSubtext.textContent = subtextOverride || `Win: $${formatChips(win)}`;
      actionBtn.disabled = false;
    }
    else if (state === 'WAITING') {
      actionBtn.classList.add('waiting');
      btnText.textContent = "WAITING";
      btnSubtext.textContent = "Round in progress";
      actionBtn.disabled = true;
    }
    else if (state === 'BET_PLACED') {
      actionBtn.classList.add('cancel'); // Red button to denote waiting
      btnText.textContent = "BET PLACED";
      btnSubtext.textContent = "Waiting for flight...";
      actionBtn.disabled = true; // Or allow cancel if API supports it
    }
  };

  // ====================== FIXED HISTORY FUNCTION ======================
  function updateHistory(arr) {
    const historyArray = Array.isArray(arr) ? arr : [];

    // latest 7
    const recent = historyArray.slice(0, 7);

    historyRibbon.innerHTML = "";

    recent.forEach(h => {
      const crash = Number(h.crashAt) || 0;
      const span = document.createElement("span");
      span.classList.add("badge");

      // Multi-color tier system
      if (crash >= 100) span.classList.add("badge-diamond");    // VERY RARE
      else if (crash >= 50) span.classList.add("badge-legend");
      else if (crash >= 20) span.classList.add("badge-ultra");
      else if (crash >= 10) span.classList.add("badge-high");
      else if (crash >= 5) span.classList.add("badge-midhigh");
      else if (crash >= 2) span.classList.add("badge-med");
      else if (crash >= 1.20) span.classList.add("badge-safe");
      else span.classList.add("badge-low");

      span.textContent = crash.toFixed(2) + "x";
      historyRibbon.appendChild(span);
    });
  }

  // ====================== SOCKET EVENTS ======================

  // Server sends history → SAFE handler
  socket.on("historyUpdate", (data) => {
    if (!data || !Array.isArray(data.history)) return;
    updateHistory(data.history);
  });

  socket.on('betTimer', ({ timeLeft }) => {

    // Do NOT override if flight already started
    if (gameState === 'FLYING') return;

    gameState = 'BETTING';

    progressBarContainer.classList.add('active');
    const percentage = (timeLeft / 5) * 100;
    progressBar.style.width = `${percentage}%`;

    gameStatusText.textContent = `STARTING IN ${timeLeft.toFixed(1)}s`;
    gameStatusText.style.color = 'var(--gold)';

    multiplierDisplay.classList.remove('crashed');
    multiplierDisplay.style.color = '#fff';

    resetGraph();

    // FIXED LOGIC:
    if (hasActiveBet) {
      // Bet accepted, waiting for flight to begin
      updateActionButton('BET_PLACED');
    } else {
      // No bet yet
      updateActionButton('BET');
    }
  });

  // 2. Round Start / State Sync
  socket.on('roundState', ({ state, multiplier, flightOngoing }) => {
    currentMultiplier = multiplier;
    multiplierDisplay.textContent = multiplier.toFixed(2) + 'x';

    if (state === 'betting') {
      gameState = 'BETTING';
      flightArea.classList.remove('flying', 'crashed');
      hasCashedOut = false;
      // hasActiveBet is handled by 'betPlaced' event
    }
    else if (state === 'flying') {
      gameState = 'FLYING';
      progressBarContainer.classList.remove('active');
      flightArea.classList.add('flying');

      if (flightOngoing) {
        // We joined late
        startFlightAnimation(true); // true = sync mode (simplified)
        if (hasActiveBet && !hasCashedOut) {
          updateActionButton('CASHOUT');
        } else {
          updateActionButton('WAITING');
          gameStatusText.textContent = "WAIT FOR NEXT ROUND";
        }
      } else {
        // Fresh start
        startFlightAnimation(false);

        if (hasActiveBet && !hasCashedOut) {
          updateActionButton('CASHOUT');
        } else {
          updateActionButton('WAITING');
          gameStatusText.textContent = "FLIGHT IN PROGRESS";

        }
      }
    }
  });

  // 3. Multiplier Update (The Loop)
  socket.on('multiplierUpdate', ({ multiplier }) => {
    currentMultiplier = multiplier;
    multiplierDisplay.textContent = multiplier.toFixed(2) + 'x';

    // Client-side Auto Cashout Trigger
    if (autoCashoutEnabled && hasActiveBet && !hasCashedOut && currentMultiplier >= autoCashoutValue) {
      handleCashOut();
    }

    // Update Cashout Button Text dynamically
    if (hasActiveBet && !hasCashedOut) {
      const currentWin = currentBetAmount * currentMultiplier;
      btnSubtext.textContent = `Win: $${formatChips(currentWin)}`;
    }

    // Update Plane Graphics
    // Calculate 't' based on multiplier (logarithmic scale usually feels better for Aviator)
    // Simple Linear Mapping for visual demo: 1x to 100x
    // Use time-based animation in startFlightAnimation, this creates the data points
  });

  // 4. Crash
  socket.on('roundCrashed', ({ crashAt }) => {
    gameState = 'CRASHED';
    currentMultiplier = crashAt;
    multiplierDisplay.textContent = crashAt.toFixed(2) + 'x';

    // Visuals
    flightArea.classList.remove('flying');
    flightArea.classList.add('crashed');
    multiplierDisplay.style.color = 'var(--crash-red)';
    gameStatusText.textContent = "FLEW AWAY!";
    gameStatusText.style.color = 'var(--crash-red)';

    stopFlightAnimation();
    flyAwayPlaneAnimation();

    // Reset User State
    hasActiveBet = false;
    hasCashedOut = false;
    updateActionButton('WAITING'); // Briefly waiting before next bet timer
    updateHistory(history);   // FIXED
  });

  // 5. Bet Confirmation
  socket.on('betPlaced', ({ userId: bidderId, amount }) => {
    // Normalize incoming bidderId too
    if (!bidderId) return;
    bidderId = String(bidderId);

    // If we don't have a known current user id, bail (or handle differently)
    if (!userId) {
      console.warn('betPlaced received but local userId is not set');
      return;
    }

    if (bidderId === userId) {
      // Update balance and state
      userBalance -= amount;
      balanceEl.textContent = formatChips(userBalance);
      hasActiveBet = true;
      hasCashedOut = false;

      // If the flight is already in progress, offer CASH OUT immediately.
      // Otherwise show BET_PLACED (waiting for flight to start)
      if (gameState === 'FLYING') {
        updateActionButton('CASHOUT');
        // ensure subtext shows the current potential win
        const win = currentBetAmount * currentMultiplier;
        btnSubtext.textContent = `Win: $${formatChips(win)}`;
      } else {
        updateActionButton('BET_PLACED');
      }

      showPopup(`Bet Placed: $${formatChips(amount)}`);
    }
  });


  // 6. Cashout Confirmation
  socket.on('cashedOut', ({ userId: casherId, win, multiplier }) => {
    if (casherId === userId) {
      userBalance += win;
      balanceEl.textContent = formatChips(userBalance);
      hasCashedOut = true;
      updateActionButton('WAITING');
      btnSubtext.textContent = `Won $${formatChips(win)}`;
      showPopup(`Cashed Out: $${formatChips(win)}`);
    }
  });

  // ====================== ACTION HANDLERS ======================

  actionBtn.addEventListener('click', () => {
    if (actionBtn.classList.contains('bet')) {
      handlePlaceBet();
    } else if (actionBtn.classList.contains('cashout')) {
      handleCashOut();
    }
  });

  function handlePlaceBet() {
    const amount = currentBetAmount;
    if (amount > userBalance) return showPopup("Insufficient Balance");

    // Emit Socket
    socket.emit('placeBet', { userId, amount });
    // Optimistic UI update happens in 'betPlaced' listener
  }

  function handleCashOut() {
    if (hasCashedOut || !hasActiveBet) return;
    // Disable immediately to prevent double clicks
    actionBtn.disabled = true;
    socket.emit('cashOut', { userId });
  }

  // ====================== MODAL LOGIC ======================

  // Bet Modal
  openBetModalBtn.addEventListener('click', () => {
    if (hasActiveBet) return showPopup("Bet already placed for this round");
    modalBetInput.value = currentBetAmount;
    betModal.classList.add('active');
  });

  modalBetInput.addEventListener('blur', () => {
    let val = parseFloat(modalBetInput.value) || MIN_BET;
    if (val < MIN_BET) val = MIN_BET;
    if (val > MAX_BET) val = MAX_BET;
    modalBetInput.value = val;
  });


  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      let current = parseFloat(modalBetInput.value) || 0;

      if (btn.dataset.add) current += parseFloat(btn.dataset.add);
      else if (btn.id === 'halfBet') current = Math.max(MIN_BET, Math.floor(current / 2));
      else if (btn.id === 'doubleBet') current *= 2;
      else if (btn.id === 'maxBet') current = MAX_BET; // only clamp here

      modalBetInput.value = current; // show temporary value
    });
  });

  confirmBetBtn.addEventListener('click', () => {
    let val = parseFloat(modalBetInput.value) || MIN_BET;

    if (val < MIN_BET) val = MIN_BET;
    if (val > MAX_BET) val = MAX_BET;

    currentBetAmount = val;
    displayBetValue.textContent = `$${formatChips(currentBetAmount)}`;
    betModal.classList.remove('active');
  });


  // Auto Modal
  openAutoModalBtn.addEventListener('click', () => {
    modalAutoInput.value = autoCashoutValue;
    autoModal.classList.add('active');
  });

  autoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'disableAuto') {
        modalAutoInput.value = '';
      } else {
        modalAutoInput.value = btn.dataset.val;
      }
    });
  });

  confirmAutoBtn.addEventListener('click', () => {
    const val = parseFloat(modalAutoInput.value);
    if (!val || isNaN(val)) {
      autoCashoutEnabled = false;
      displayAutoValue.textContent = "OFF";
    } else {
      autoCashoutEnabled = true;
      autoCashoutValue = val;
      displayAutoValue.textContent = `${val.toFixed(2)}x`;
    }
    autoModal.classList.remove('active');
  });

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      betModal.classList.remove('active');
      autoModal.classList.remove('active');
    });
  });

  // ====================== GRAPH ANIMATION (BEZIER) ======================

  function resetGraph() {
    stopFlightAnimation();
    points = [];
    planeEl.style.left = '0px';
    planeEl.style.bottom = '0px';
    planeEl.style.transform = 'scale(1) rotate(0deg)';
    planeEl.style.opacity = '1';
    graphPathEl.setAttribute('d', '');
    graphPathEl.style.strokeDasharray = '';
    graphPathEl.style.strokeDashoffset = '';
  }

  function flyAwayPlaneAnimation() {
    planeEl.style.transition = 'transform 0.8s ease-in, opacity 0.8s ease-out';
    // Fly off top right
    planeEl.style.transform = `translate(${flightArea.offsetWidth}px, -${flightArea.offsetHeight}px) rotate(-45deg) scale(0.5)`;
    planeEl.style.opacity = '0';
  }

  function startFlightAnimation(lateJoin) {
    stopFlightAnimation();
    points = [];

    // Reset plane styling for flight
    planeEl.style.transition = 'none';
    planeEl.style.opacity = '1';

    let animStart = Date.now();
    // Adjust duration to match average crash curve or socket sync
    let duration = 3000; // This controls the "speed" of the curve visually

    // Bezier Control Points (Classic Aviator curve)
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 0.2, y: 0.05 };
    const p2 = { x: 0.5, y: 0.15 };
    const p3 = { x: 0.80, y: 0.7 };

    function cubicBezier(t, p0, p1, p2, p3) {
      const x = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * t * t * p2.x + t * t * t * p3.x;
      const y = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * t * t * p2.y + t * t * t * p3.y;
      return { x, y };
    }

    function animate() {
      if (gameState !== 'FLYING') return;

      // Determine 't' based on elapsed time or log of multiplier
      // Here we use time for smoothness
      let t = (Date.now() - animStart) / duration;
      if (t > 1) t = 1;

      // Calculate Position
      const pt = cubicBezier(t, p0, p1, p2, p3);

      const areaWidth = flightArea.offsetWidth;
      const areaHeight = flightArea.offsetHeight;

      const px = pt.x * areaWidth;
      const py = pt.y * areaHeight; // from bottom

      // Update Plane
      const tilt = 5 + (3 * t); // Tilt up as it goes
      const scale = 1 + (1 * t);

      planeEl.style.left = `${px}px`;
      planeEl.style.bottom = `${py}px`;
      planeEl.style.transform = `scale(${scale}) rotate(-${tilt}deg)`;

      // Update Path
      // We redraw the curve from 0 to current t
      drawPath(t, p0, p1, p2, p3);

      if (t < 1) {
        flightAnimInterval = requestAnimationFrame(animate);
      }
    }
    flightAnimInterval = requestAnimationFrame(animate);
  }

  function drawPath(t, p0, p1, p2, p3) {
    const areaWidth = flightArea.offsetWidth;
    const areaHeight = flightArea.offsetHeight;

    // Calculate bezier points
    function bezier(tt) {
      const x = Math.pow(1 - tt, 3) * p0.x + 3 * Math.pow(1 - tt, 2) * tt * p1.x + 3 * (1 - tt) * tt * tt * p2.x + tt * tt * tt * p3.x;
      const y = Math.pow(1 - tt, 3) * p0.y + 3 * Math.pow(1 - tt, 2) * tt * p1.y + 3 * (1 - tt) * tt * tt * p2.y + tt * tt * tt * p3.y;
      return { x: x * areaWidth, y: areaHeight - (y * areaHeight) }; // SVG Y is top-down
    }

    // Create SVG path string
    let d = `M ${0} ${areaHeight}`; // Start bottom-left
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
      const pt = bezier((i / steps) * t);
      d += ` L ${pt.x} ${pt.y}`;
    }
    graphPathEl.setAttribute('d', d);
  }

  function stopFlightAnimation() {
    if (flightAnimInterval) cancelAnimationFrame(flightAnimInterval);
  }
});