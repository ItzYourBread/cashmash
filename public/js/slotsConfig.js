const slotsConfig = {
  SlotsClassic: {
    symbols: [
      // Low-paying symbols (high frequency, low or negative return)
      { name: 'cherry', file: '/images/SlotsClassic/cherry.png', multiplier: 1 },
      { name: 'lemon', file: '/images/SlotsClassic/lemon.png', multiplier: 1 },    
      { name: 'orange', file: '/images/SlotsClassic/orange.png', multiplier: 1.5 },
      { name: 'watermelon', file: '/images/SlotsClassic/watermelon.png', multiplier: 2 },
      
      // High-paying symbols (low frequency, high return)
      { name: 'grapes', file: '/images/SlotsClassic/grapes.png', multiplier: 4 },
      { name: 'star', file: '/images/SlotsClassic/star.png', multiplier: 5 },
      { name: 'red7', file: '/images/SlotsClassic/red7.png', multiplier: 12 },
      { name: 'diamond', file: '/images/SlotsClassic/diamond.png', multiplier: 8 },
      { name: 'bar', file: '/images/SlotsClassic/bar.png', multiplier: 20 },
      { name: 'jackpot', file: '/images/SlotsClassic/jackpot.png', multiplier: 100 },
    ],

    reels: 5,
    rows: 4,

    // Chance configuration: Total weight is 143.
    // Cherry and Lemon now account for over 70% of the weights to force a win frequency near 35%.
    symbolChances: {
      cherry: 60,       // Highest chance, very low payout
      lemon: 40,        // High chance, break-even payout
      orange: 15,
      watermelon: 8,
      grapes: 6,
      star: 5,
      red7: 3,
      diamond: 3,
      bar: 2,
      jackpot: 1        // Lowest chance for max profit on the big prize
    },

    // slotsConfig.js - Complete Legit Paylines Array

    paylines: [
      // 1. Straight Horizontal (4)
      [0, 0, 0, 0, 0], // Top Row
      [1, 1, 1, 1, 1], // Second Row
      [2, 2, 2, 2, 2], // Third Row
      [3, 3, 3, 3, 3], // Bottom Row

      // 2. Main Diagonals (2)
      [0, 1, 2, 3, 3], // Top-Left to Bottom-Right
      [3, 2, 1, 0, 0], // Bottom-Left to Top-Right

      // 3. V-Shapes (4)
      [0, 1, 2, 1, 0], // Wide V-Shape
      [3, 2, 1, 2, 3], // Inverted Wide V-Shape
      [1, 2, 3, 2, 1], // Narrow V-Shape
      [2, 1, 0, 1, 2], // Inverted Narrow V-Shape

      // 4. Zig-Zag / Step Patterns (4)
      [0, 1, 0, 1, 0], // Top Zig-Zag (W)
      [3, 2, 3, 2, 3], // Bottom Zig-Zag (M)
      [0, 0, 1, 1, 2], // Step Down
      [3, 3, 2, 2, 1]  // Step Up
    ],

    spinDuration: 1500
  }
};

export default slotsConfig;