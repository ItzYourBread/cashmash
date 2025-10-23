const socket = io();

const multiplierEl = document.getElementById('multiplier');
const resultText = document.getElementById('resultText');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const betAmountInput = document.getElementById('betAmount');
const planeEl = document.getElementById('plane');
const flightArea = document.querySelector('.flight-area');
const historyEl = document.getElementById('history');
const timeBarEl = document.getElementById('timeBar');
const graphSvgEl = document.getElementById('graph-svg'); // The SVG container
const graphPathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path'); // The path element

// Assume 'window.user' exists and has a unique ID
const userId = window.user?._id; 

let hasBet = false;
let hasCashedOut = false;
let currentMultiplier = 1.0;
let isFlying = false;
let flightAnimInterval = null;
let showOverlay = false;
let points = []; // Array to store path coordinates

// Setup the SVG path element
if (graphSvgEl) {
    graphPathEl.setAttribute('id', 'flight-path');
    graphSvgEl.appendChild(graphPathEl);
}

// ---------------- SOCKET EVENTS ----------------
socket.on('connect', () => console.log('🟢 Connected to Aviator server'));

// Betting countdown
socket.on('betTimer', ({ timeLeft }) => {
  if (timeBarEl) timeBarEl.style.width = (timeLeft / 5) * 100 + '%';
});

// Round state
socket.on('roundState', ({ round, state, multiplier, history, flightOngoing }) => {
  currentMultiplier = multiplier;
  multiplierEl.textContent = multiplier.toFixed(2) + 'x';

  if (state === 'betting') {
    // Normal betting phase
    resultText.textContent = `Round ${round}: Place your bet!`;
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

  } else if (state === 'flying') {
    // Flight started
    isFlying = true;
    
    // Preparation for next-round bet during flight
    placeBetBtn.textContent = 'Betting for Next Round...';
    toggleButton(placeBetBtn, false); 
    betAmountInput.disabled = false; 

    if (flightOngoing && !hasBet) {
      showOverlay = true;
      planeEl.style.display = 'none';
      resultText.textContent = '⏳ Flight in progress, wait for next round';
      toggleButton(cashOutBtn, false);
    } else {
      showOverlay = false;
      planeEl.style.display = 'block';
      startFlightAnimation();
      toggleButton(cashOutBtn, hasBet && !hasCashedOut); 
      resultText.textContent = `✈️ Flight started!`;
    }
  }

  updateHistory(history);
});

// Multiplier update
socket.on('multiplierUpdate', ({ multiplier }) => {
  currentMultiplier = multiplier;
  multiplierEl.textContent = multiplier.toFixed(2) + 'x';
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

  resultText.textContent = `💥 Crashed at ${crashAt.toFixed(2)}x`;
  placeBetBtn.textContent = 'Place Bet';
  toggleButton(placeBetBtn, true);
  toggleButton(cashOutBtn, false);
  betAmountInput.disabled = false;

  crashPlaneAnimation();
  // Final update to draw the line to the crash point
  updateSVGPath(); 
});

// ... (Bet placed, Cashed out, and Button Handlers remain the same as the previous response)

// ---------------- FLIGHT ANIMATION ----------------
function startFlightAnimation() {
  stopFlightAnimation();
  
  // Start the path at the bottom-left corner (0, 100% height for the SVG coordinate system)
  points = [{ 
      x: 0, 
      y: flightArea.offsetHeight
  }]; 
  
  // Initialize the plane at (0, 0) relative to the flight area bottom-left
  planeEl.style.left = '0px';
  planeEl.style.bottom = '0px'; 
  
  updateSVGPath(); // Initialize graph
  
  flightAnimInterval = setInterval(() => {
    if (!isFlying || showOverlay) return;
    const progress = Math.min(currentMultiplier / 25, 1); 
    updatePlanePosition(progress);
  }, 50);
}

function updatePlanePosition(progress) {
  const areaWidth = flightArea.offsetWidth;
  const areaHeight = flightArea.offsetHeight;

  const x = progress;
  const y_curve = Math.pow(x, 1.3); // Curve height (0 to 1)

  // Plane Position (CSS 'left' and 'bottom' for the plane element)
  const left = x * areaWidth;
  const bottom = y_curve * areaHeight;

  // Plane Visuals
  const scale = 1 + x * 0.8; 
  const rotate = 15 + y_curve * 45; 

  planeEl.style.left = `${left}px`;
  planeEl.style.bottom = `${bottom}px`;
  planeEl.style.transform = `scale(${scale}) rotate(${rotate}deg)`;

  // Store SVG Coordinate (SVG's y-origin is top-left, so we flip the plane's 'bottom')
  points.push({ 
    x: left, 
    y: areaHeight - bottom 
  });
  
  // Update the SVG path visually
  updateSVGPath();
}

/**
 * Draws the curve path using SVG's 'd' attribute and applies the animation.
 */
function updateSVGPath() {
    if (!graphPathEl || points.length < 2) {
        // Clear or do nothing if not enough points
        graphPathEl.setAttribute('d', `M 0 ${flightArea.offsetHeight}`); 
        return;
    }
    
    // Start with MoveTo command (M) to the first point (bottom-left corner)
    let pathData = `M ${points[0].x} ${points[0].y}`;

    // Use a simple LineTo (L) or a more complex Curve (C) for a smoother line
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        pathData += ` L ${p.x} ${p.y}`;
    }
    
    // Set the path data
    graphPathEl.setAttribute('d', pathData);

    // Get the length of the path for the animated "drawing" effect
    const pathLength = graphPathEl.getTotalLength();
    
    // Set the dash array and offset to create the drawing animation
    // Example: If length is 100, setting dash to "100 100" and offset to 50 
    // makes the line appear 50% drawn. Setting offset to (length - 1) makes it look drawn one pixel at a time.
    graphPathEl.style.strokeDasharray = pathLength + ' ' + pathLength;
    graphPathEl.style.strokeDashoffset = pathLength - 1; // Start almost fully undrawn
}


function stopFlightAnimation() {
  if (flightAnimInterval) {
    clearInterval(flightAnimInterval);
    flightAnimInterval = null;
  }
}

function resetPlane() {
  planeEl.style.display = 'block';
  planeEl.style.left = '0px';
  planeEl.style.bottom = '0px';
  planeEl.style.transform = 'scale(1) rotate(0deg)';
  
  // Clear the path array and reset the SVG path
  points = []; 
  if (graphPathEl) {
    // Reset path to the starting point
    graphPathEl.setAttribute('d', `M 0 ${flightArea.offsetHeight}`);
    graphPathEl.style.strokeDasharray = '';
    graphPathEl.style.strokeDashoffset = '';
  }
}

function crashPlaneAnimation() {
  planeEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  planeEl.style.transform = 'scale(0.8) rotate(90deg)';
  planeEl.style.opacity = '0.3';

  setTimeout(() => {
    planeEl.style.transition = ''; 
    planeEl.style.opacity = '1';
  }, 800);
}

// ---------------- UI Helper ----------------
function toggleButton(btn, enable) {
  btn.disabled = !enable;
  btn.classList.toggle('disabled', !enable);
}

// ---------------- HISTORY ----------------
function updateHistory(history) {
  historyEl.innerHTML = '';
  if (!history || !history.length) return;
  const displayHistory = history.slice(-15); 
  displayHistory.forEach(crash => {
    const badge = document.createElement('span');
    badge.textContent = crash + 'x';
    badge.classList.add('history-badge');
    historyEl.prepend(badge);
  });
}