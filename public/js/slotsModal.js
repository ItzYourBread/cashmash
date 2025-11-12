document.addEventListener("DOMContentLoaded", () => {
  const slotsConfig = window.slotsConfig;
  const type = window.currentSlot;
  if (!slotsConfig || !type || !slotsConfig[type]) return;

  const slot = slotsConfig[type];
  const { minBet, maxBet } = slot;
  let currentBet = minBet;

  // === Elements ===
  const liveBet = document.getElementById('liveBet');
  const betPlus = document.getElementById('betPlus');
  const betMinus = document.getElementById('betMinus');
  const betSpinBtn = document.getElementById('betSpinBtn');
  const betModal = document.getElementById('betModal');
  const manualBetInput = document.getElementById('manualBetInput');
  const betOptionsContainer = document.querySelector('.bet-options');
  const betTextContainer = document.querySelector('.bet-text'); // Clickable bet amount
  const setManualBetBtn = document.getElementById('setManualBetBtn'); // New button element

  if (!liveBet || !betPlus || !betMinus || !betSpinBtn || !betModal || !manualBetInput || !betOptionsContainer || !betTextContainer) {
    console.warn("Missing bet UI elements. Check EJS and IDs.");
    return;
  }

  const STEP = 10;

  // 🧮 Update live bet display
  const updateBetDisplay = () => {
    // Note: The EJS injects "৳" but we rely on the JS to format the number
    liveBet.textContent = currentBet.toLocaleString();
    manualBetInput.value = currentBet;
  };

  // ✅ Validate and set manual input
  const validateAndUpdate = () => {
    let value = parseInt(manualBetInput.value, 10);
    if (isNaN(value)) {
        // Revert to currentBet value if manual input is empty or invalid
        manualBetInput.value = currentBet;
        return;
    }
    if (value < minBet) value = minBet;
    if (value > maxBet) value = maxBet;
    currentBet = value;
    updateBetDisplay();
  };

  // --- Core Logic Integration ---

  // === Modal Opener: Click the displayed bet amount ===
  betTextContainer.addEventListener('click', () => {
      betModal.classList.add('active');
  });

  // === + / − Buttons: Step bet AND open modal ===
  betPlus.addEventListener('click', () => {
    currentBet = Math.min(currentBet + STEP, maxBet);
    updateBetDisplay();
    betModal.classList.add('active');
  });

  betMinus.addEventListener('click', () => {
    currentBet = Math.max(currentBet - STEP, minBet);
    updateBetDisplay();
    betModal.classList.add('active');
  });

  // === Manual input logic: ENTER key ===
  manualBetInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      validateAndUpdate();
      betModal.classList.remove('active');
    }
  });

  // === Manual input logic: Blur (focus loss) ===
  manualBetInput.addEventListener('blur', () => {
    // Validate on blur, but don't close the modal
    validateAndUpdate();
  });
  

  // === Set up and handle fixed bet options ===
  const betValues = [100, 250, 500, 1000];
  betOptionsContainer.innerHTML = ''; 

  betValues.forEach(value => {
      // Only show options that are less than or equal to the maximum allowed bet
      if (value <= maxBet) {
          const button = document.createElement('button');
          button.className = 'bet-option';
          button.textContent = '৳' + value.toLocaleString();
          button.addEventListener('click', () => {
              currentBet = value;
              updateBetDisplay();
              betModal.classList.remove('active');
          });
          betOptionsContainer.appendChild(button);
      }
  });

  // Max bet button logic
  const maxBetButton = document.createElement('button');
  maxBetButton.className = 'bet-option';
  maxBetButton.textContent = 'Max Bet';
  maxBetButton.addEventListener('click', () => {
      currentBet = maxBet;
      updateBetDisplay();
      betModal.classList.remove('active');
  });
  betOptionsContainer.appendChild(maxBetButton);

  // === Close modal when clicking outside ===
  betModal.addEventListener('click', e => {
    // Only close if the click targets the modal backdrop itself
    if (e.target === betModal) {
      validateAndUpdate();
      betModal.classList.remove('active');
    }
  });

  // === Spin button - Passes currentBet to the hidden input
  betSpinBtn.addEventListener('click', () => {
    const betInput = document.getElementById('betAmount');
    const spinBtn = document.getElementById('spinBtn');
    if (betInput) betInput.value = currentBet;
    if (spinBtn) spinBtn.click();
  });

  // Initialize display
  updateBetDisplay();
});