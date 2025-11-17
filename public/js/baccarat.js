document.addEventListener("DOMContentLoaded", () => {
  // ====================== UTILITY FUNCTION (K/M FORMAT) ======================
  const formatChips = (amount) => {
    if (Math.abs(amount) < 1000) return parseFloat(amount).toFixed(2);
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(amount);
  };
  // ===========================================================================

  // --- DOM Elements ---
  const dealBtn = document.getElementById("dealBtn");
  const resultText = document.getElementById("resultText");
  const playerHandDiv = document.getElementById("playerHand");
  const bankerHandDiv = document.getElementById("bankerHand");
  const playerScoreDiv = document.getElementById("playerScore");
  const bankerScoreDiv = document.getElementById("bankerScore");
  const balanceSpan = document.getElementById("balance");
  const betPlayerInput = document.getElementById("betPlayer");
  const betBankerInput = document.getElementById("betBanker");
  const betTieInput = document.getElementById("betTie");

  // --- Bet limits ---
  const MIN_BET = 0.1;
  const MAX_BET = 100;

  function addBlurCorrection(input) {
    input.addEventListener("blur", () => {
      let val = parseFloat(input.value);
      if (isNaN(val) || val < MIN_BET) val = MIN_BET;
      if (val > MAX_BET) val = MAX_BET;
      input.value = val.toFixed(2);
    });
  }

  [betPlayerInput, betBankerInput, betTieInput].forEach(addBlurCorrection);

  // --- Initialize balance ---
  let balance = parseFloat(balanceSpan.dataset.rawBalance) || parseFloat(balanceSpan.textContent) || 0;
  balanceSpan.textContent = formatChips(balance);

  // --- Card Helper Functions ---
  function createCardFace(card, isBack = false, color = "black") {
    const img = document.createElement("img");
    img.classList.add("card", isBack ? "card-back" : "card-front");
    img.style.backfaceVisibility = "hidden";
    if (isBack) {
      img.src = `/images/playing-cards/player_card_back_design_1_${color}.svg`;
      img.style.transform = "rotateY(0deg)";
    } else {
      img.src = `/images/playing-cards/${card.file}`;
      img.alt = `${card.rank} of ${card.suit}`;
      img.style.position = "absolute";
      img.style.top = "0";
      img.style.left = "0";
      img.style.transform = "rotateY(180deg)";
    }
    return img;
  }

  function placeInitialCard(targetContainer, color) {
    const slot = document.createElement("div");
    slot.classList.add("card-slot");
    slot.style.transformStyle = "preserve-3d";
    slot.style.position = "relative";
    slot.appendChild(createCardFace(null, true, color));
    targetContainer.appendChild(slot);
    return slot;
  }

  async function flipCardAnimation(cardSlot, cardData, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!cardData) return resolve();
        const back = cardSlot.querySelector(".card-back");
        const front = createCardFace(cardData, false);
        cardSlot.appendChild(front);
        cardSlot.style.transition = "transform 0.6s ease";
        cardSlot.style.transform = "rotateY(180deg)";
        setTimeout(() => { if (back) back.remove(); resolve(); }, 400);
      }, delay);
    });
  }

  function setupInitialHands() {
    playerHandDiv.innerHTML = "";
    bankerHandDiv.innerHTML = "";
    playerScoreDiv.textContent = "0";
    bankerScoreDiv.textContent = "0";
    for (let i = 0; i < 3; i++) {
      const pSlot = placeInitialCard(playerHandDiv, "red");
      const bSlot = placeInitialCard(bankerHandDiv, "black");
      if (i === 2) { pSlot.style.display = "none"; bSlot.style.display = "none"; }
    }
  }

  setupInitialHands();

  // --- Deal Button Logic ---
  dealBtn.addEventListener("click", async () => {
    let betPlayer = parseFloat(betPlayerInput.value) || 0;
    let betBanker = parseFloat(betBankerInput.value) || 0;
    let betTie = parseFloat(betTieInput.value) || 0;

    // Auto-correct if user entered out-of-range values before dealing
    [betPlayerInput, betBankerInput, betTieInput].forEach(input => {
      let val = parseFloat(input.value);
      if (isNaN(val) || val < MIN_BET) val = MIN_BET;
      if (val > MAX_BET) val = MAX_BET;
      input.value = val.toFixed(2);
    });

    betPlayer = parseFloat(betPlayerInput.value);
    betBanker = parseFloat(betBankerInput.value);
    betTie = parseFloat(betTieInput.value);

    const totalBet = betPlayer + betBanker + betTie;

    if (totalBet <= 0) { alert("Place at least one bet."); return; }
    if (totalBet > balance) { alert(`Not enough balance! You have $${balance.toFixed(2)}`); return; }

    resultText.textContent = "Dealing cards...";
    setupInitialHands();
    dealBtn.disabled = true;

    const playerSlots = Array.from(playerHandDiv.querySelectorAll(".card-slot"));
    const bankerSlots = Array.from(bankerHandDiv.querySelectorAll(".card-slot"));

    try {
      balance -= totalBet;
      balanceSpan.textContent = formatChips(balance);

      const response = await fetch("/baccarat/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betPlayer, betBanker, betTie }),
      });
      const data = await response.json();
      if (!data.success) {
        balance += totalBet; balanceSpan.textContent = formatChips(balance);
        throw new Error(data.message || "Server error");
      }

      let delay = 200;
      for (let i = 0; i < 2; i++) {
        await flipCardAnimation(playerSlots[i], data.player.cards[i], delay);
        await flipCardAnimation(bankerSlots[i], data.banker.cards[i], delay);
        delay += 300;
      }

      if (data.player.cards.length === 3) { playerSlots[2].style.display = "block"; await flipCardAnimation(playerSlots[2], data.player.cards[2], delay); delay += 300; }
      else playerSlots[2].style.display = "none";

      if (data.banker.cards.length === 3) { bankerSlots[2].style.display = "block"; await flipCardAnimation(bankerSlots[2], data.banker.cards[2], delay); delay += 300; }
      else bankerSlots[2].style.display = "none";

      setTimeout(() => {
        playerScoreDiv.textContent = data.player.points;
        bankerScoreDiv.textContent = data.banker.points;
        let winnerText = "";
        if (data.result === "player") winnerText = "Player Wins! (1:1)";
        else if (data.result === "banker") winnerText = "Banker Wins! (0.95:1)";
        else winnerText = "Tie! (8:1)";
        resultText.textContent = `${winnerText} | Profit: ${formatChips(data.profit)}`;
        balance = data.balance;
        balanceSpan.textContent = formatChips(balance);
        dealBtn.disabled = false;
      }, delay + 150);

    } catch (err) {
      console.error(err);
      resultText.textContent = "Error: " + (err.message || "Server error");
      dealBtn.disabled = false;
    }
  });
});
