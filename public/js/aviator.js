const socket = io();

const multiplierEl = document.getElementById('multiplier');
const resultText = document.getElementById('resultText');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const betAmountInput = document.getElementById('betAmount');
const planeEl = document.getElementById('plane');
const flightArea = document.querySelector('.flight-area');
const timeBarEl = document.getElementById('timeBar');
const graphSvgEl = document.getElementById('graph-svg'); // The SVG container
const graphPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // The path element
const balanceEl = document.getElementById('balance');

// A DOM container for small fading trail dots
const trailContainer = document.createElement('div');

// Assume 'window.user' exists and has a unique ID
const userId = window.user?._id; 

let hasBet = false;
let hasCashedOut = false;
let currentMultiplier = 1.0;
let isFlying = false;
let flightAnimInterval = null;
let showOverlay = false;
let points = []; // Array to store path coordinates
let lastPlanePos = { x: 0, y: 0 };
let trails = []; // DOM elements for trailing dots

// Prevents SVG path from being redrawn after fly-away until next round
let pathClearedAfterFlyAway = false;

// Setup the SVG path element
if (graphSvgEl) {
    graphPathEl.setAttribute('id', 'flight-path');
    graphPathEl.setAttribute('fill', 'none');
    graphPathEl.setAttribute('stroke', '#00ff66');
    graphPathEl.setAttribute('stroke-width', '3');
    graphPathEl.setAttribute('stroke-linecap', 'round');
    graphPathEl.setAttribute('stroke-linejoin', 'round');
    graphSvgEl.appendChild(graphPathEl);

    // Place a trail container inside flightArea to hold fading dots
    trailContainer.className = 'trail-container';
    trailContainer.style.position = 'absolute';
    trailContainer.style.top = 0;
    trailContainer.style.left = 0;
    trailContainer.style.width = '100%';
    trailContainer.style.height = '100%';
    trailContainer.style.pointerEvents = 'none';
    trailContainer.style.overflow = 'hidden';
    if (flightArea) flightArea.appendChild(trailContainer);
}

// ---------------- SOCKET EVENTS ----------------
socket.on('connect', () => {});

// Betting countdown
socket.on('betTimer', ({ timeLeft }) => {
  if (timeBarEl) timeBarEl.style.width = (timeLeft / 5) * 100 + '%';
  // Show cooldown in result/status text
  if (resultText) {
    if (timeLeft > 0) {
      resultText.textContent = `Flight in ${timeLeft}s`;
    } else {
      resultText.textContent = 'Place your bet!';
    }
  }
});

// Round state
socket.on('roundState', ({ round, state, multiplier, history, flightOngoing }) => {
  currentMultiplier = multiplier;
  if (multiplierEl) multiplierEl.textContent = multiplier.toFixed(2) + 'x';

  if (state === 'betting') {
    // Normal betting phase
    resultText.textContent = `Place your bet!`;
    resetPlane();
    stopFlightAnimation();
    isFlying = false;
    showOverlay = false;

    hasBet = false;
    hasCashedOut = false;

  // Reset button text and enable for current round
  placeBetBtn.textContent = 'Place Bet';
  toggleButton(placeBetBtn, true); 
  toggleButton(cashOutBtn, false);
  betAmountInput.disabled = false;
  // ensure sunburst overlay is off when not flying
  if (flightArea) flightArea.classList.remove('flight-active');

  } else if (state === 'flying') {
    // Flight started
    isFlying = true;

    // Preparation for next-round bet during flight
    placeBetBtn.textContent = 'Betting for Next Round...';
    toggleButton(placeBetBtn, false); 
    betAmountInput.disabled = false; 

    if (flightOngoing) {
      if (!hasBet) {
        resultText.textContent = '⏳ Flight in progress, wait for next round';
        toggleButton(cashOutBtn, false);
      }
      // Show the plane flying for everyone, even non-betters
      showOverlay = false;
      isFlying = true; // Mark as flying to prevent reset
      planeEl.style.display = 'block';
      
      // Calculate current position based on multiplier
      const progress = Math.min(currentMultiplier / 25, 1);
      const x = Math.min(0.75 * progress, 0.75); // Keep within bounds
      const y = Math.min(0.75 * progress, 0.75);
      
      // Immediately position plane without animation
      const areaWidth = flightArea.offsetWidth;
      const areaHeight = flightArea.offsetHeight;
      const left = x * areaWidth;
      const bottom = y * areaHeight;
      const tilt = -15 + 25 * progress;
      const scale = 1.4 + x * 0.8;
      
      // Force plane position
      planeEl.style.transition = 'none';
      planeEl.style.left = `${left}px`;
      planeEl.style.bottom = `${bottom}px`;
      planeEl.style.transform = `scale(${scale}) rotate(${tilt}deg)`;
      
      // Update path immediately
      updateSVGPath(progress);
      
      // Enable betting for next round
      placeBetBtn.textContent = 'Betting for Next Round...';
      toggleButton(placeBetBtn, false);
      toggleButton(cashOutBtn, hasBet && !hasCashedOut);
      if (flightArea) flightArea.classList.add('flight-active');
    } else {
      showOverlay = false;
      planeEl.style.display = 'block';
      startFlightAnimation();
      toggleButton(cashOutBtn, hasBet && !hasCashedOut); 
      if (flightArea) flightArea.classList.add('flight-active');
      resultText.textContent = `✈️ Flight started!`;
    }
  }

});

// Multiplier update
socket.on('multiplierUpdate', ({ multiplier }) => {
  currentMultiplier = multiplier;
  if (multiplierEl) {
    multiplierEl.textContent = multiplier.toFixed(2) + 'x';
    // Rainbow color effect based on multiplier value
    const display = document.getElementById('multiplierDisplay');
    if (display) {
      let color = '#f5c542';
      if (multiplier >= 2 && multiplier < 3) color = '#42f554'; // green
      else if (multiplier >= 3 && multiplier < 5) color = '#42d4f5'; // blue
      else if (multiplier >= 5 && multiplier < 10) color = '#a142f5'; // purple
      else if (multiplier >= 10 && multiplier < 20) color = '#f542e9'; // pink
      else if (multiplier >= 20 && multiplier < 50) color = '#f54242'; // red
      else if (multiplier >= 50) color = '#f5e142'; // yellow
      display.style.color = color;
      display.style.textShadow = `0 0 18px ${color}, 0 0 32px #fff`;
    }
  }
  if (!showOverlay) {
    const progress = Math.min(currentMultiplier / 25, 1); 
    updatePlanePosition(progress);
  }
});

// Round crashed
socket.on('roundCrashed', ({ crashAt }) => {
  currentMultiplier = crashAt;
  isFlying = false;
  stopFlightAnimation();
  planeEl.style.display = 'block';
  showOverlay = false;

  resultText.textContent = `✈️ Flew away!`;
  placeBetBtn.textContent = 'Place Bet';
  toggleButton(placeBetBtn, true);
  toggleButton(cashOutBtn, false);
  betAmountInput.disabled = false;

  flyAwayPlaneAnimation();
  // Final update to draw the line to the end point
  updateSVGPath(); 
  // stop sunburst overlay when round ends
  if (flightArea) flightArea.classList.remove('flight-active');
});

// Small client-side handlers for placing bets and cashing out
socket.on('betPlaced', ({ userId: bidderId, amount, username }) => {
  // Show small UI notification in the result area
  if (bidderId === window.user?._id) {
    resultText.textContent = `✅ Bet placed ${amount}`;
    hasBet = true;
    placeBetBtn.textContent = 'Bet Placed';
    toggleButton(placeBetBtn, false);
    toggleButton(cashOutBtn, true);
    betAmountInput.disabled = true;
  } else {
    // You can optionally show other player's bet
    // resultText.textContent = `${username} placed ${amount}`;
  }
});

socket.on('cashedOut', ({ userId: casherId, username, win, multiplier }) => {
  // Update UI for cashouts
  if (casherId === window.user?._id) {
    resultText.textContent = `🏁 Cashed out ${win} (${multiplier.toFixed(2)}x)`;
    hasCashedOut = true;
    toggleButton(cashOutBtn, false);
    toggleButton(placeBetBtn, false);
    // Update balance if provided elsewhere; safe to fetch live balance from server if needed
    if (typeof balanceEl !== 'undefined' && balanceEl) {
      // If server emitted a personal update you can use it; otherwise fetch the current balance from the page or response
      // We don't have the balance in this socket event in all cases, so leave as-is unless server returns it.
    }
  }
});

// Place bet action
placeBetBtn.addEventListener('click', async () => {
  const amount = Number(betAmountInput.value);
  if (!amount || amount <= 0) {
    resultText.textContent = 'Enter a valid bet amount';
    return;
  }

  // disable while pending
  toggleButton(placeBetBtn, false);
  resultText.textContent = 'Placing bet...';

  try {
    const res = await fetch('/aviator/bet', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount })
    });

  let data;
  try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      // show server-provided message when possible
      const errMsg = data && (data.error || data.message) ? (data.error || data.message) : `HTTP ${res.status}`;
      resultText.textContent = errMsg;
      // re-enable if betting is allowed (depending on server state)
      toggleButton(placeBetBtn, true);
      return;
    }

    if (!data || !data.ok) {
      resultText.textContent = (data && data.error) ? data.error : 'Bet failed';
      toggleButton(placeBetBtn, true);
      return;
    }

    // Success: server returns new balance
    if (data.balance !== undefined && balanceEl) balanceEl.textContent = data.balance;
    hasBet = true;
    placeBetBtn.textContent = 'Bet Placed';
    toggleButton(placeBetBtn, false);
    toggleButton(cashOutBtn, true);
    betAmountInput.disabled = true;
    resultText.textContent = `✅ Bet placed ${amount}`;
  } catch (err) {
    resultText.textContent = 'Server error placing bet';
    toggleButton(placeBetBtn, true);
  }
});

// Cash out action
cashOutBtn.addEventListener('click', async () => {
  // disable UI while request in-flight
  toggleButton(cashOutBtn, false);
  resultText.textContent = 'Cashing out...';

  try {
    const res = await fetch('/aviator/cashout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    });

  let data;
  try { data = await res.json(); } catch (e) { data = null; }

    if (!res.ok) {
      const errMsg = data && (data.error || data.message) ? (data.error || data.message) : `HTTP ${res.status}`;
      resultText.textContent = errMsg;
      toggleButton(cashOutBtn, true);
      return;
    }

    if (!data || !data.ok) {
      resultText.textContent = (data && data.error) ? data.error : 'Cashout failed';
      toggleButton(cashOutBtn, true);
      return;
    }

    // Update balance and UI
    if (data.balance !== undefined && balanceEl) balanceEl.textContent = data.balance;
    hasCashedOut = true;
    toggleButton(cashOutBtn, false);
    resultText.textContent = `🏁 Cashed out ${data.winnings} (${data.multiplier.toFixed(2)}x)`;
  } catch (err) {
    resultText.textContent = 'Server error cashing out';
    toggleButton(cashOutBtn, true);
  }
});

// --------------- BUTTON HANDLERS ---------------
placeBetBtn.addEventListener('click', () => {
  if (hasBet || isFlying) return;
  const betAmount = parseFloat(betAmountInput.value);
  if (isNaN(betAmount) || betAmount <= 0) {
    alert('Invalid bet amount');
    return;
  }
  socket.emit('placeBet', { userId, amount: betAmount });
});

cashOutBtn.addEventListener('click', () => {
  if (!hasBet || hasCashedOut || showOverlay) return;
  socket.emit('cashOut', { userId });
});

// ---------------- FLIGHT ANIMATION ----------------
function startFlightAnimation() {
  stopFlightAnimation();
  // Delayed upward arc: stays low, then rises steeply at the end
  points = [];
  planeEl.style.left = '0px';
  planeEl.style.bottom = '0px';
  planeEl.style.transform = 'scale(1.3) rotate(0deg)';
  lastPlanePos = { x: 0, y: 0 };
  updateSVGPath(0); // Initialize graph

  let animStart = Date.now();
  let duration = 1400; // ms, total flight duration
  // Start: (0,0), End: (0.75,0.75) - reduced path but keeps curve shape
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 0.2, y: 0.05 };
  const p2 = { x: 0.5, y: 0.15 };
  const p3 = { x: 0.75, y: 0.75 };
  function cubicBezier(t, p0, p1, p2, p3) {
    const x = Math.pow(1-t,3)*p0.x + 3*Math.pow(1-t,2)*t*p1.x + 3*(1-t)*t*t*p2.x + t*t*t*p3.x;
    const y = Math.pow(1-t,3)*p0.y + 3*Math.pow(1-t,2)*t*p1.y + 3*(1-t)*t*t*p2.y + t*t*t*p3.y;
    return { x, y };
  }
  function animate() {
    if (!isFlying || showOverlay) return;
    let t = (Date.now() - animStart) / duration;
    if (t > 1) t = 1;
    const pt = cubicBezier(t, p0, p1, p2, p3);
    updatePlanePositionCustom(pt.x, pt.y, t);
    updateSVGPath(t, p0, p1, p2, p3);
    if (t < 1) {
      flightAnimInterval = requestAnimationFrame(animate);
    } else {
      // Hold plane at final position
      updatePlanePositionCustom(p3.x, p3.y, 1);
      updateSVGPath(1, p0, p1, p2, p3);
    }
  }
  flightAnimInterval = requestAnimationFrame(animate);
}

// Custom plane position for simple upward curve
function updatePlanePositionCustom(nx, ny, t) {
  const areaWidth = flightArea.offsetWidth;
  const areaHeight = flightArea.offsetHeight;
  // nx, ny are 0..1 (left to right, bottom to top)
  const left = nx * areaWidth;
  const bottom = ny * areaHeight;
  // Gentle tilt upward
  let tilt = -15 + 25 * t;  // original tilt range
  const scale = 1.2 + nx * 0.7;  // restored original scaling
  planeEl.style.left = `${left}px`;
  planeEl.style.bottom = `${bottom}px`;
  planeEl.style.transform = `scale(${scale}) rotate(${tilt}deg)`;
  lastPlanePos.x = left;
  lastPlanePos.y = bottom;
  points.push({ x: left, y: areaHeight - bottom });
  spawnTrailDot(left, bottom);
}

// Draws a simple cubic Bezier SVG path matching the flight
function updateSVGPath(t = 1, p0, p1, p2, p3) {
  if (!graphPathEl || pathClearedAfterFlyAway) return;
  const areaWidth = flightArea.offsetWidth;
  const areaHeight = flightArea.offsetHeight;
  // Use the same delayed upward arc control points as the animation
  p0 = p0 || { x: 0, y: 0 };
  p1 = p1 || { x: 0.25, y: 0.05 };
  p2 = p2 || { x: 0.7, y: 0.15 };
  p3 = p3 || { x: 0.95, y: 0.95 };
  // For partial path, interpolate up to t
  function bezier(tt, p0, p1, p2, p3) {
    const x = Math.pow(1-tt,3)*p0.x + 3*Math.pow(1-tt,2)*tt*p1.x + 3*(1-tt)*tt*tt*p2.x + tt*tt*tt*p3.x;
    const y = Math.pow(1-tt,3)*p0.y + 3*Math.pow(1-tt,2)*tt*p1.y + 3*(1-tt)*tt*tt*p2.y + tt*tt*tt*p3.y;
    return { x, y };
  }
  let samples = Math.max(8, Math.floor(40 * t));
  let pts = [];
  for (let i = 0; i <= samples; i++) {
    let tt = (i / samples) * t;
    let pt = bezier(tt, p0, p1, p2, p3);
    pts.push({ x: pt.x * areaWidth, y: areaHeight - pt.y * areaHeight });
  }
  let pathData = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    pathData += ` L ${pts[i].x} ${pts[i].y}`;
  }
  graphPathEl.setAttribute('d', pathData);
  // Animate stroke draw
  try {
    const pathLength = graphPathEl.getTotalLength();
    graphPathEl.style.transition = 'stroke-dashoffset 0.15s linear';
    graphPathEl.style.strokeDasharray = pathLength + ' ' + pathLength;
    graphPathEl.style.strokeDashoffset = Math.max(0, pathLength - pathLength * t);
  } catch (e) {}
}

function stopFlightAnimation() {
  if (flightAnimInterval) {
    clearInterval(flightAnimInterval);
    flightAnimInterval = null;
  }

  // Don't clear trails if flight is ongoing (for refresh cases)
  if (!isFlying) {
    setTimeout(() => {
      trails.forEach(t => t.remove());
      trails = [];
    }, 1000);
  }
}

function resetPlane() {
  // Don't reset if we're in an ongoing flight
  if (isFlying) return;

  planeEl.style.display = 'block';
  planeEl.style.left = '0px';
  planeEl.style.bottom = '0px';
  planeEl.style.transform = 'scale(1) rotate(0deg)';

  // Clear the path array and SVG path only at round start, not after fly-away
  points = [];
  if (graphPathEl) {
    // Only clear the path, do not reset to a downward line
    graphPathEl.setAttribute('d', '');
    graphPathEl.style.strokeDasharray = '';
    graphPathEl.style.strokeDashoffset = '';
  }
  pathClearedAfterFlyAway = false;

  // Remove trails
  trails.forEach(t => t.remove());
  trails = [];
}


// Animate the plane flying away (up/right and fading out)
function flyAwayPlaneAnimation(immediate = false) {
  // If immediate, fly out instantly after reaching top-right
  planeEl.style.transition = 'transform 1s cubic-bezier(0.4,1,0.7,1), opacity 1s linear';
  // Move further up/right and fade out (negative Y for upward)
  planeEl.style.transform += ' translate(250px, -500px) scale(2.30) rotate(65deg)';
  planeEl.style.opacity = '0';
    planeEl.style.transition = '';
    planeEl.style.opacity = '1';
    // Clear the SVG flight path after flying away
    if (graphPathEl) {
      graphPathEl.setAttribute('d', '');
      graphPathEl.style.strokeDasharray = '';
      graphPathEl.style.strokeDashoffset = '';
    }
    pathClearedAfterFlyAway = true;
}

/**
 * Spawn a small DOM dot at (left, bottom) relative to flightArea that fades and scales.
 * duration in ms optional.
 */
function spawnTrailDot(left, bottom, duration = 700) {
  if (!trailContainer) return;
  const dot = document.createElement('div');
  dot.className = 'trail';
  dot.style.position = 'absolute';
  dot.style.left = `${left}px`;
  // convert bottom to top for absolutely positioned element
  dot.style.top = `${flightArea.offsetHeight - bottom}px`;
  dot.style.width = '6px';
  dot.style.height = '6px';
  dot.style.borderRadius = '50%';
  dot.style.background = 'rgba(86, 86, 86, 0.9)';
  dot.style.boxShadow = '0 0 6px rgba(72, 72, 72, 0.9)';
  dot.style.pointerEvents = 'none';
  dot.style.transform = 'translate(-50%, -50%) scale(1)';
  dot.style.opacity = '1';
  dot.style.transition = `opacity ${duration}ms linear, transform ${duration}ms ease-out`;

  trailContainer.appendChild(dot);
  trails.push(dot);

  // cap number of trails to avoid DOM growth
  if (trails.length > 80) {
    const rem = trails.splice(0, trails.length - 80);
    rem.forEach(r => r.remove());
  }

  // trigger fade/scale
  requestAnimationFrame(() => {
    dot.style.opacity = '0';
    dot.style.transform = 'translate(-50%, -50%) scale(0.4)';
  });

  setTimeout(() => {
    dot.remove();
    const idx = trails.indexOf(dot);
    if (idx >= 0) trails.splice(idx, 1);
  }, duration + 50);
}

// ---------------- UI Helper ----------------
function toggleButton(btn, enable) {
  btn.disabled = !enable;
  btn.classList.toggle('disabled', !enable);
}