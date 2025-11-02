document.addEventListener("DOMContentLoaded", () => {
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

  // --- Card Helper Functions ---
  function createCardFace(card, isBack = false, color = "black") {
    const img = document.createElement("img");
    img.classList.add("card", isBack ? "card-back" : "card-front");
    img.style.backfaceVisibility = "hidden";

    if (isBack) {
      // Assuming card back image path
      img.src = `/images/playing-cards/player_card_back_design_1_${color}.svg`; 
      img.style.transform = "rotateY(0deg)";
    } else {
      // Assuming card front image path is based on the file property from the controller
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
    const back = createCardFace(null, true, color);
    slot.appendChild(back);
    targetContainer.appendChild(slot);
    return slot;
  }

  async function flipCardAnimation(cardSlot, cardData, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Safety check: only proceed if there is card data to show
        if (!cardData) return resolve(); 

        const back = cardSlot.querySelector(".card-back");
        const front = createCardFace(cardData, false);
        cardSlot.appendChild(front);

        cardSlot.style.transition = "transform 0.6s ease";
        cardSlot.style.transform = "rotateY(180deg)";

        setTimeout(() => {
          if (back) back.remove();
          resolve();
        }, 400); // 400ms is halfway through the 600ms transition
      }, delay);
    });
  }

  function setupInitialHands() {
    playerHandDiv.innerHTML = "";
    bankerHandDiv.innerHTML = "";
    playerScoreDiv.textContent = "0";
    bankerScoreDiv.textContent = "0";

    // Create 3 card slots for each hand (3rd card initially hidden)
    for (let i = 0; i < 3; i++) {
      const pSlot = placeInitialCard(playerHandDiv, "red");
      const bSlot = placeInitialCard(bankerHandDiv, "black");
      if (i === 2) {
        pSlot.style.display = "none";
        bSlot.style.display = "none";
      }
    }
  }

  setupInitialHands();

  // --- Deal Button Logic ---
  dealBtn.addEventListener("click", async () => {
    const betPlayer = parseFloat(betPlayerInput.value) || 0;
    const betBanker = parseFloat(betBankerInput.value) || 0;
    const betTie = parseFloat(betTieInput.value) || 0;

    if (betPlayer + betBanker + betTie <= 0) {
      alert("Please place at least one bet.");
      return;
    }

    resultText.textContent = "Dealing cards...";
    setupInitialHands(); // Reset hands to initial card backs
    dealBtn.disabled = true;

    const playerSlots = Array.from(playerHandDiv.querySelectorAll(".card-slot"));
    const bankerSlots = Array.from(bankerHandDiv.querySelectorAll(".card-slot"));

    try {
      // Call the fixed Baccarat controller endpoint
      const response = await fetch("/baccarat/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betPlayer, betBanker, betTie }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Server error");

      let delay = 200;

      // 1. Animate the first two cards for Player and Banker
      for (let i = 0; i < 2; i++) {
        await flipCardAnimation(playerSlots[i], data.player.cards[i], delay);
        await flipCardAnimation(bankerSlots[i], data.banker.cards[i], delay);
        delay += 300;
      }
      
      // 2. Animate Player's third card (if it exists)
      if (data.player.cards.length === 3) {
        playerSlots[2].style.display = "block"; // Show the slot
        await flipCardAnimation(playerSlots[2], data.player.cards[2], delay);
        delay += 300;
      } else {
        playerSlots[2].style.display = "none"; // Ensure the slot is hidden if no 3rd card was drawn
      }

      // 3. Animate Banker's third card (if it exists)
      if (data.banker.cards.length === 3) {
        bankerSlots[2].style.display = "block"; // Show the slot
        await flipCardAnimation(bankerSlots[2], data.banker.cards[2], delay);
        delay += 300;
      } else {
        bankerSlots[2].style.display = "none"; // Ensure the slot is hidden if no 3rd card was drawn
      }
      
      // 4. Update scores and final results after animations finish
      setTimeout(() => {
        playerScoreDiv.textContent = data.player.points;
        bankerScoreDiv.textContent = data.banker.points;

        let winnerText = "";
        if (data.result === "player") winnerText = "Player Wins! (1:1)";
        else if (data.result === "banker") winnerText = "Banker Wins! (0.95:1)";
        else winnerText = "Tie! (8:1)";

        resultText.textContent = `${winnerText} | Profit: ${data.profit.toFixed(2)}`;

        balanceSpan.textContent = data.balance.toFixed(2);
        dealBtn.disabled = false;
      }, delay + 150); // Small final pause

    } catch (err) {
      console.error(err);
      resultText.textContent = "Error: " + (err.message || "Server error");
      dealBtn.disabled = false;
    }
  });
});