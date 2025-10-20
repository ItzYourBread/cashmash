document.addEventListener("DOMContentLoaded", () => {
  const dealBtn = document.getElementById("dealBtn");
  const resultText = document.getElementById("resultText");
  const playerHandDiv = document.getElementById("playerHand");
  const bankerHandDiv = document.getElementById("bankerHand");
  const playerScoreDiv = document.getElementById("playerScore");
  const bankerScoreDiv = document.getElementById("bankerScore");
  const balanceSpan = document.getElementById("balance");
  const historyDiv = document.getElementById("history");

  // Removed deck visual elements and related functions (createCardBack, createCardFront, dealCardAnimation)

  function createCardFace(card, isBack = false, color = "black") {
    const img = document.createElement("img");
    img.classList.add("card", isBack ? "card-back" : "card-front");
    img.style.backfaceVisibility = "hidden"; // Key for flip effect

    if (isBack) {
      img.src = `/images/playing-cards/player_card_back_design_1_${color}.svg`;
      img.style.transform = "rotateY(0deg)"; // Start facing forward (showing back)
    } else {
      img.src = `/images/playing-cards/${card.file}`;
      img.alt = `${card.rank} of ${card.suit}`;
      img.style.position = "absolute";
      img.style.top = "0";
      img.style.left = "0";
      img.style.transform = "rotateY(180deg)"; // Start flipped (showing front's back)
    }
    return img;
  }

  function placeInitialCard(targetContainer, color) {
    const slot = document.createElement("div");
    slot.classList.add("card-slot");
    slot.style.transformStyle = "preserve-3d"; // Key for flip effect
    slot.style.position = "relative"; // Ensure children position correctly

    const back = createCardFace(null, true, color);
    slot.appendChild(back);

    targetContainer.appendChild(slot);
    return slot; // Return the slot to be used later for flipping
  }

  async function flipCardAnimation(cardSlot, cardData, delay) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const back = cardSlot.querySelector(".card-back");
        const front = createCardFace(cardData, false);
        cardSlot.appendChild(front);

        // Apply flip transition to the slot
        cardSlot.style.transition = "transform 0.6s ease";
        cardSlot.style.transform = "rotateY(180deg)";

        setTimeout(() => {
          // Clean up the back image (optional, but good practice)
          back.remove();
          resolve();
        }, 400);
      }, delay);
    });
  }

  function addHistory(winner) {
    const badge = document.createElement("span");
    badge.classList.add("history-badge");
    badge.textContent = winner.charAt(0).toUpperCase();
    badge.classList.add(`hist-${winner}`);
    historyDiv.appendChild(badge);
    if (historyDiv.children.length > 12) {
      historyDiv.removeChild(historyDiv.firstChild);
    }
  }

  dealBtn.addEventListener("click", async () => {
    const bet = parseFloat(document.getElementById("betAmount").value);
    const choice = document.getElementById("betOn").value;

    if (!bet || bet <= 0) {
      alert("Please enter a valid bet amount.");
      return;
    }

    resultText.textContent = "Placing bet...";
    playerHandDiv.innerHTML = "";
    bankerHandDiv.innerHTML = "";
    playerScoreDiv.textContent = "0";
    bankerScoreDiv.textContent = "0";

    // 1. Initial Card Placement (Backs)
    const playerSlots = [];
    const bankerSlots = [];

    // Place initial two cards for Player and Banker
    for (let i = 0; i < 2; i++) {
        playerSlots.push(placeInitialCard(playerHandDiv, "red"));
        bankerSlots.push(placeInitialCard(bankerHandDiv, "black"));
    }
    
    // Add third card slots if necessary (will be flipped later if a third card is dealt)
    playerSlots.push(placeInitialCard(playerHandDiv, "red"));
    bankerSlots.push(placeInitialCard(bankerHandDiv, "black"));

    // Initially hide the 3rd card slots
    playerSlots[2].style.display = 'none';
    bankerSlots[2].style.display = 'none';


    resultText.textContent = "Cards dealt, awaiting reveal...";
    dealBtn.disabled = true;

    try {
      const response = await fetch("/baccarat/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet, choice })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Server error");

      // 2. Flip Animations
      let delay = 200;
      
      // Flip all cards dealt (2 or 3)
      for (let i = 0; i < data.player.cards.length; i++) {
        if(i > 1) playerSlots[i].style.display = 'block'; // Show 3rd card slot if it exists
        await flipCardAnimation(playerSlots[i], data.player.cards[i], delay);
        delay += 300;
      }
      for (let i = 0; i < data.banker.cards.length; i++) {
        if(i > 1) bankerSlots[i].style.display = 'block'; // Show 3rd card slot if it exists
        await flipCardAnimation(bankerSlots[i], data.banker.cards[i], delay);
        delay += 300;
      }
      
      // If no 3rd card was dealt, remove the placeholder slots
      if (data.player.cards.length < 3) playerSlots[2].remove();
      if (data.banker.cards.length < 3) bankerSlots[2].remove();


      setTimeout(() => {
        playerScoreDiv.textContent = data.player.points;
        bankerScoreDiv.textContent = data.banker.points;

        let winnerText = "";
        if (data.result === "player") winnerText = "Player Wins!";
        else if (data.result === "banker") winnerText = "Banker Wins!";
        else winnerText = "It's a Tie!";

        resultText.textContent = `${winnerText} | Profit: ${data.profit.toFixed(2)}`;

        // Update chips
        const currentBalance = parseFloat(balanceSpan.textContent);
        balanceSpan.textContent = (currentBalance + data.profit).toFixed(2);

        // History
        addHistory(data.result);
        dealBtn.disabled = false;
      }, delay + 150);
    } catch (err) {
      console.error(err);
      resultText.textContent = "Error: " + (err.message || "Server error");
      dealBtn.disabled = false;
    }
  });
});