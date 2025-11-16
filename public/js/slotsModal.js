document.addEventListener("DOMContentLoaded", () => {
  const slotsConfig = window.slotsConfig;
  const type = window.currentSlot;
  if (!slotsConfig || !type || !slotsConfig[type]) return;

  const slot = slotsConfig[type];
  const { minBet, maxBet } = slot;
  let currentBet = minBet;

  // === ELEMENTS ===
  const liveBet = document.getElementById("liveBet");
  const betPlus = document.getElementById("betPlus");
  const betMinus = document.getElementById("betMinus");
  const betSpinBtn = document.getElementById("betSpinBtn");
  const betModal = document.getElementById("betModal");
  const manualBetInput = document.getElementById("manualBetInput");
  const betOptionsContainer = document.querySelector(".bet-options");
  const betTextContainer = document.querySelector(".bet-text");

  // === INFO MODAL ===
  const infoBtn = document.getElementById("infoBtn");
  const infoModal = document.getElementById("infoModal");

  const STEP = 10;

  /* ----------------------------------------------------
     BET SYSTEM (Updated Modal System)
  ---------------------------------------------------- */

  const updateBetDisplay = () => {
    liveBet.textContent = currentBet.toLocaleString();
    manualBetInput.value = currentBet;
  };

  const validateAndUpdate = () => {
    let value = parseInt(manualBetInput.value, 10);
    if (isNaN(value)) {
      manualBetInput.value = currentBet;
      return;
    }
    if (value < minBet) value = minBet;
    if (value > maxBet) value = maxBet;
    currentBet = value;
    updateBetDisplay();
  };

  betTextContainer.addEventListener("click", () => {
    betModal.classList.add("active");
  });

  betPlus.addEventListener("click", () => {
    currentBet = Math.min(currentBet + STEP, maxBet);
    updateBetDisplay();
    betModal.classList.add("active");
  });

  betMinus.addEventListener("click", () => {
    currentBet = Math.max(currentBet - STEP, minBet);
    updateBetDisplay();
    betModal.classList.add("active");
  });

  manualBetInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      validateAndUpdate();
      betModal.classList.remove("active");
    }
  });

  manualBetInput.addEventListener("blur", () => {
    validateAndUpdate();
  });

  betOptionsContainer.innerHTML = "";
  const betValues = [100, 250, 500, 1000];
  betValues.forEach((value) => {
    if (value <= maxBet) {
      const button = document.createElement("button");
      button.className = "bet-option";
      button.textContent = "$" + value.toLocaleString();
      button.addEventListener("click", () => {
        currentBet = value;
        updateBetDisplay();
        betModal.classList.remove("active");
      });
      betOptionsContainer.appendChild(button);
    }
  });

  const maxBetButton = document.createElement("button");
  maxBetButton.className = "bet-option";
  maxBetButton.textContent = "Max Bet";
  maxBetButton.addEventListener("click", () => {
    currentBet = maxBet;
    updateBetDisplay();
    betModal.classList.remove("active");
  });
  betOptionsContainer.appendChild(maxBetButton);

  betModal.addEventListener("click", (e) => {
    if (e.target === betModal) {
      validateAndUpdate();
      betModal.classList.remove("active");
    }
  });

  betSpinBtn.addEventListener("click", () => {
    const betInput = document.getElementById("betAmount");
    const spinBtn = document.getElementById("spinBtn");
    if (betInput) betInput.value = currentBet;
    if (spinBtn) spinBtn.click();
  });

  /* ----------------------------------------------------
     INFO MODAL (GAME DETAILS / SYMBOLS / BONUS)
  ---------------------------------------------------- */

  if (infoBtn && infoModal) {
    const symbolList = slot.symbols
      .map(
        (s) => `
        <li>
          <img src="${s.file}" class="mini-symbol" />
          <strong>${formatSymbolName(s.name)}:</strong> x${s.multiplier}
          ${s.bonus ? `<em>(${s.bonus})</em>` : ""}
        </li>
      `
      )
      .join("");

    infoModal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>${slot.title} — Game Info</h2>
        <p>${slot.description}</p>
        <h3>Symbol Multipliers</h3>
        <ul>${symbolList}</ul>
        <h3>Bonus Info</h3>
        <p>${slot.bonusInfo}</p>
      </div>
    `;

    const closeBtn = infoModal.querySelector(".close-btn");

    infoBtn.addEventListener("click", () => {
      infoModal.classList.add("active");
    });

    closeBtn.addEventListener("click", () => {
      infoModal.classList.remove("active");
    });

    infoModal.addEventListener("click", (e) => {
      if (e.target === infoModal) infoModal.classList.remove("active");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") infoModal.classList.remove("active");
    });
  }

  /* ----------------------------------------------------
     INITIALIZE
  ---------------------------------------------------- */
  updateBetDisplay();
});

function formatSymbolName(name) {
  return name
    .replace(/([A-Z])/g, " $1")    // camelCase → words
    .replace(/[_-]+/g, " ")        // snake_case or dash-case → space
    .replace(/\s+/g, " ")          // remove double spaces
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase()); // capitalize words
}
