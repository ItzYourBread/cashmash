document.addEventListener("DOMContentLoaded", () => {
    // ================= CONFIG & STATE =================
    const slotsConfig = window.slotsConfig;
    const type = window.currentSlot;
    if (!slotsConfig || !type || !slotsConfig[type]) return;

    const slot = slotsConfig[type];
    const { minBet, maxBet } = slot;
    
    // Current user balance (grabbed from DOM)
    const balanceEl = document.getElementById("balance");
    let userBalance = parseFloat(balanceEl.dataset.rawBalance) || 0;
    let currentBet = minBet;

    // ================= DOM ELEMENTS =================
    // Display Elements
    const displayBetValue = document.getElementById("displayBetValue");
    const resultAmountDisplay = document.getElementById("resultAmount");
    const statusTextDisplay = document.getElementById("statusText");
    
    // Main Action
    const actionBtn = document.getElementById("actionBtn");
    const btnText = actionBtn.querySelector(".btn-text");
    const btnSubtext = actionBtn.querySelector(".btn-subtext");
    
    // Hidden Engine Elements (Bridge to your engine)
    const hiddenBetInput = document.getElementById("betAmount");
    const hiddenSpinBtn = document.getElementById("spinBtn");

    // Modals & Triggers
    const betModal = document.getElementById("betModal");
    const infoModal = document.getElementById("infoModal");
    const openBetModalBtn = document.getElementById("openBetModalBtn");
    const openInfoModalBtn = document.getElementById("openInfoModalBtn");
    const closeButtons = document.querySelectorAll(".close-modal");
    
    // Bet Modal Logic
    const modalBetInput = document.getElementById("modalBetInput");
    const confirmBetBtn = document.getElementById("confirmBet");
    const chipBtns = document.querySelectorAll(".chip-btn");

    // ================= INITIALIZATION =================
    updateBetDisplay();

    // ================= BETTING LOGIC =================
    function updateBetDisplay() {
        displayBetValue.textContent = `$${currentBet.toFixed(2)}`;
        hiddenBetInput.value = currentBet; // Sync with engine
        modalBetInput.value = currentBet;
    }

    openBetModalBtn.addEventListener("click", () => {
        if(actionBtn.disabled) return; // Prevent change during spin
        modalBetInput.value = currentBet;
        betModal.classList.add("active");
    });

    // Chip Buttons in Modal
    chipBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            let val = parseFloat(modalBetInput.value) || minBet;
            
            if (btn.dataset.set) {
                val = parseFloat(btn.dataset.set);
            } else if (btn.id === "halfBet") {
                val = Math.floor(val / 2);
            } else if (btn.id === "doubleBet") {
                val = val * 2;
            } else if (btn.id === "maxBet") {
                val = userBalance > maxBet ? maxBet : userBalance;
            }

            // Clamping
            if (val < minBet) val = minBet;
            if (val > maxBet) val = maxBet;

            modalBetInput.value = val;
        });
    });

    confirmBetBtn.addEventListener("click", () => {
        let val = parseFloat(modalBetInput.value);
        if (isNaN(val) || val < minBet) val = minBet;
        if (val > maxBet) val = maxBet;
        
        currentBet = val;
        updateBetDisplay();
        betModal.classList.remove("active");
    });

    // ================= SPIN LOGIC =================
    actionBtn.addEventListener("click", () => {
        if (currentBet > userBalance) {
            statusTextDisplay.textContent = "Insufficient Funds!";
            statusTextDisplay.style.color = "#ff4b4b";

            return;
        }

        // Visual State Update
        actionBtn.disabled = true;
        btnText.textContent = "SPINNING...";
        btnSubtext.textContent = "Good Luck!";
        statusTextDisplay.textContent = "Rolling...";
        statusTextDisplay.style.color = "#fff";
        resultAmountDisplay.textContent = "$0.00";
        resultAmountDisplay.classList.remove("highlight");

        // Trigger the hidden engine button
        hiddenSpinBtn.click();

        // We observe the engine's behavior via an event or timeout 
        // (Assuming your engine resets the button state, or we simulate it)
        // Since I don't see the engine code, I will add a listener to the canvas 
        // or rely on the engine to re-enable interaction. 
        
        // If your engine doesn't emit an event, we can reset UI after a timeout 
        // based on standard spin time (e.g., 3 seconds)
        setTimeout(() => {
            actionBtn.disabled = false;
            btnText.textContent = "SPIN";
            btnSubtext.textContent = "Press to Roll";
        }, 2500); 
    });

    // Monitor Balance Changes (Optional: if engine updates the hidden balance span)
    const observer = new MutationObserver(() => {
        userBalance = parseFloat(balanceEl.innerText.replace(/[^0-9.-]+/g,"")) || 0;
    });
    observer.observe(balanceEl, { childList: true, subtree: true });

    // ================= INFO / PAYTABLE LOGIC =================
    openInfoModalBtn.addEventListener("click", () => {
        populateInfoModal();
        infoModal.classList.add("active");
    });

    function populateInfoModal() {
        const container = document.getElementById("infoContent");
        
        const symbolList = slot.symbols.map(s => `
            <li class="paytable-item">
                <img src="${s.file}" class="mini-symbol" alt="${s.name}">
                <div class="paytable-info">
                    <span class="paytable-name">${formatSymbolName(s.name)}</span>
                    <span class="paytable-multi">Multiplier: x${s.multiplier} ${s.bonus ? '(Bonus)' : ''}</span>
                </div>
            </li>
        `).join("");

        container.innerHTML = `
            <p class="game-desc">${slot.description}</p>
            <h4 style="color:var(--gold); margin:10px 0;">Symbols & Payouts</h4>
            <ul class="paytable-list">
                ${symbolList}
            </ul>
            <div style="margin-top:15px; padding:10px; background:rgba(255,255,255,0.05); border-radius:8px;">
                <small style="color:#aaa;">${slot.bonusInfo}</small>
            </div>
        `;
    }

    function formatSymbolName(name) {
        return name.replace(/([A-Z])/g, " $1")
                   .replace(/[_-]+/g, " ")
                   .trim()
                   .replace(/\b\w/g, c => c.toUpperCase());
    }

    // ================= GLOBAL CLOSE =================
    closeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            betModal.classList.remove("active");
            infoModal.classList.remove("active");
        });
    });

    window.addEventListener("click", (e) => {
        if (e.target === betModal) betModal.classList.remove("active");
        if (e.target === infoModal) infoModal.classList.remove("active");
    });
});