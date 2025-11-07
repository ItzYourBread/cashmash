const slotsConfig = {
  ClassicSlot: {
    // 💥 HIGH VOLATILITY SETTINGS (Fewer, bigger wins)
    baseWinRate: {
        MIN: 0.4, // Low minimum chance
        MAX: 0.99  // Wide range for control logic
    },
    symbols: [
      { name: 'cherry', file: '/images/ClassicSlot/cherry.png', multiplier: 0.8 },
      { name: 'lemon', file: '/images/ClassicSlot/lemon.png', multiplier: 1 },
      { name: 'orange', file: '/images/ClassicSlot/orange.png', multiplier: 1.2 },
      { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png', multiplier: 1.8 },
      { name: 'grapes', file: '/images/ClassicSlot/grapes.png', multiplier: 3 },
      { name: 'star', file: '/images/ClassicSlot/star.png', multiplier: 4 },
      { name: 'red7', file: '/images/ClassicSlot/red7.png', multiplier: 10 },
      { name: 'diamond', file: '/images/ClassicSlot/diamond.png', multiplier: 8 },
      { name: 'bar', file: '/images/ClassicSlot/bar.png', multiplier: 20 },
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 100 },
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      cherry: 100000, lemon: 35, orange: 25, watermelon: 15, grapes: 10,
      star: 8, red7: 3, diamond: 3, bar: 2, jackpot: 1
    },
    paylines: [
      // 1-4: Essential Horizontal Lines (4 lines)
      [0, 0, 0, 0, 0], // Top
      [1, 1, 1, 1, 1], // Upper Middle
      [2, 2, 2, 2, 2], // Lower Middle
      [3, 3, 3, 3, 3], // Bottom

      // 5-10: Simple Zig-Zag (V/Inverted V/Dips) (6 lines)
      [0, 1, 2, 1, 0], // V-Shape
      [3, 2, 1, 2, 3], // Inverted V-Shape
      [1, 0, 0, 0, 1], // Upper Dip
      [2, 3, 3, 3, 2], // Lower Dip
      [0, 0, 1, 0, 0], // Top Squiggle
      [3, 3, 2, 3, 3], // Bottom Squiggle

      // 11-14: Core Diagonals (4 lines)
      [0, 1, 2, 3, 2], // Diag Down, Back Up
      [3, 2, 1, 0, 1], // Diag Up, Back Down
      [0, 1, 2, 3, 3], // Corner-to-Corner (Ends Low)
      [3, 2, 1, 0, 0], // Corner-to-Corner (Ends High)

      // 15-20: Extended Zig-Zag (W/M Patterns) (6 lines)
      [0, 1, 0, 1, 0],
      [3, 2, 3, 2, 3],
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],
      [1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2],

      // 21-25: Ladder/Step Patterns (5 lines)
      [0, 0, 1, 2, 3], // Left-to-Right Stair Step
      [3, 3, 2, 1, 0], // Reverse Stair Step
      [0, 1, 1, 2, 2], // Slow Climb
      [3, 2, 2, 1, 1], // Slow Descent
      [1, 2, 2, 3, 3]  // Mid-to-Bottom Climb
    ],
    spinDuration: 1500
  },

  PharaohsRiches: {
    // ✨ LOW VOLATILITY SETTINGS (More, smaller wins)
    baseWinRate: {
        MIN: 0.6, // Higher minimum chance for frequent small wins
        MAX: 0.16  // Tighter range for control logic
    },
    symbols: [
      // 9 -> 6
      { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png', multiplier: 6 },
      // 7 -> 5
      { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png', multiplier: 5 },
      // 3 -> 2
      { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png', multiplier: 2 },
      // 2.5 -> 1.8
      { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png', multiplier: 1.8 },
      // 4 -> 3
      { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png', multiplier: 3 },
      // 1.5 -> 1.0 (Lowest possible multiplier)
      { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png', multiplier: 1.0 },
      // 6 -> 4
      { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png', multiplier: 4 },
      // 2 -> 1.5
      { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png', multiplier: 1.5 },
      // 100 -> 100
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 100 } 
    ],

    reels: 5,
    rows: 4,

    // 💰 ADJUSTED CHANCES FOR MAXIMUM PROFITABILITY (Total = 100)
    symbolChances: {
      goldCoin: 52.9,         // Increased chance for the now-1x payout
      scarab: 18,
      hieroglyphScroll: 25,   
      ankh: 12,
      pyramid: 8,
      sphinx: 2,              // Further reduced chance
      pharaoh: 1,             // Further reduced chance
      treasureChest: 1,       // Further reduced chance
      ra: 0.1                 // Drastically reduced chance for jackpot
    },

    paylines: [
      // 1-4: Essential Horizontal Lines (4 lines)
      [0, 0, 0, 0, 0], // Top
      [1, 1, 1, 1, 1], // Upper Middle
      [2, 2, 2, 2, 2], // Lower Middle
      [3, 3, 3, 3, 3], // Bottom

      // 5-10: Simple Zig-Zag (V/Inverted V/Dips) (6 lines)
      [0, 1, 2, 1, 0], // V-Shape
      [3, 2, 1, 2, 3], // Inverted V-Shape
      [1, 0, 0, 0, 1], // Upper Dip
      [2, 3, 3, 3, 2], // Lower Dip
      [0, 0, 1, 0, 0], // Top Squiggle
      [3, 3, 2, 3, 3], // Bottom Squiggle

      // 11-14: Core Diagonals (4 lines)
      [0, 1, 2, 3, 2], // Diag Down, Back Up
      [3, 2, 1, 0, 1], // Diag Up, Back Down
      [0, 1, 2, 3, 3], // Corner-to-Corner (Ends Low)
      [3, 2, 1, 0, 0], // Corner-to-Corner (Ends High)

      // 15-20: Extended Zig-Zag (W/M Patterns) (6 lines)
      [0, 1, 0, 1, 0],
      [3, 2, 3, 2, 3],
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],
      [1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2],

      // 21-25: Ladder/Step Patterns (5 lines)
      [0, 0, 1, 2, 3], // Left-to-Right Stair Step
      [3, 3, 2, 1, 0], // Reverse Stair Step
      [0, 1, 1, 2, 2], // Slow Climb
      [3, 2, 2, 1, 1], // Slow Descent
      [1, 2, 2, 3, 3]  // Mid-to-Bottom Climb
    ],
    spinDuration: 1500
  }
};

module.exports = slotsConfig;
