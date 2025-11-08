const slotsConfig = {
  ClassicSlot: {
    // 💥 HIGH VOLATILITY SETTINGS (Fewer, bigger wins)
    baseWinRate: {
      MIN: 0.6, // Low minimum chance
      MAX: 0.30  // Wide range for control logic
    },
    symbols: [
      { name: 'cherry', file: '/images/ClassicSlot/cherry.png', multiplier: 0.5 },
      { name: 'lemon', file: '/images/ClassicSlot/lemon.png', multiplier: 0.7 },
      { name: 'orange', file: '/images/ClassicSlot/orange.png', multiplier: 0.8 },
      { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png', multiplier: 1.2 },
      { name: 'grapes', file: '/images/ClassicSlot/grapes.png', multiplier: 2.0 },
      { name: 'star', file: '/images/ClassicSlot/star.png', multiplier: 2.5 },
      { name: 'diamond', file: '/images/ClassicSlot/diamond.png', multiplier: 4.0 },
      { name: 'red7', file: '/images/ClassicSlot/red7.png', multiplier: 5.0 },
      { name: 'bar', file: '/images/ClassicSlot/bar.png', multiplier: 10.0 },
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 40.0 }
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      cherry: 50, lemon: 35, orange: 25, watermelon: 15, grapes: 10,
      star: 8, red7: 3, diamond: 3, bar: 3, jackpot: 3
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
      MIN: 0.4, // Low minimum chance
      MAX: 0.28  // Wide range for control logic
    },
    symbols: [
      { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png', multiplier: 0.6 },
      { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png', multiplier: 1.1 },
      { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png', multiplier: 0.9 },
      { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png', multiplier: 1.3 },
      { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png', multiplier: 1.8 },
      { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png', multiplier: 2.5 },
      { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png', multiplier: 3.0 },
      { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png', multiplier: 3.5 },
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 100.0 }
    ],

    reels: 5,
    rows: 4,

    // 💰 ADJUSTED CHANCES FOR MAXIMUM PROFITABILITY (Total = 100)
    symbolChances: {
      goldCoin: 30,         // Increased chance for the now-1x payout
      scarab: 25,
      hieroglyphScroll: 18,
      ankh: 12,
      pyramid: 6,
      sphinx: 4,              // Further reduced chance
      pharaoh: 3,             // Further reduced chance
      treasureChest: 3,       // Further reduced chance
      ra: 2                 // Drastically reduced chance for jackpot
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

  DragonBlaze: {
    // 🔥 MEDIUM-HIGH VOLATILITY SETTINGS (Epic fire theme)
    baseWinRate: {
      MIN: 0.7, // Moderate minimum chance
      MAX: 0.26  // Wider spread for dramatic wins
    },

    // 🐲 SYMBOLS — matches your existing image assets
    symbols: [
      { name: 'emberCoin', file: '/images/DragonBlazeSlots/emberCoin.png', multiplier: 0.6 },
      { name: 'fireRune', file: '/images/DragonBlazeSlots/fireRune.png', multiplier: 1.0 },
      { name: 'flameSword', file: '/images/DragonBlazeSlots/flameSword.png', multiplier: 1.8 },
      { name: 'lavaShield', file: '/images/DragonBlazeSlots/lavaShield.png', multiplier: 2.5 },
      { name: 'dragonEye', file: '/images/DragonBlazeSlots/dragonEye.png', multiplier: 3.5 },
      { name: 'phoenixFeather', file: '/images/DragonBlazeSlots/phoenixFeather.png', multiplier: 5.0 },
      { name: 'blazeCrown', file: '/images/DragonBlazeSlots/blazeCrown.png', multiplier: 8.0 },
      { name: 'goldenDragon', file: '/images/DragonBlazeSlots/goldenDragon.png', multiplier: 15.0 },
      { name: 'dragonBlaze', file: '/images/DragonBlazeSlots/dragonBlaze.png', multiplier: 40.0 } // 🔥 jackpot
    ],

    reels: 5,
    rows: 4,

    // 🎯 SYMBOL CHANCES (Total = 100)
    symbolChances: {
      emberCoin: 25,
      fireRune: 20,
      flameSword: 15,
      lavaShield: 12,
      dragonEye: 10,
      phoenixFeather: 8,
      blazeCrown: 5,
      goldenDragon: 3,
      dragonBlaze: 2
    },

    // 🕹️ 25 Paylines (balanced mix of horizontals, diagonals, zigs)
    paylines: [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0],
      [3, 2, 1, 2, 3],
      [1, 0, 0, 0, 1],
      [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0],
      [3, 3, 2, 3, 3],
      [0, 1, 2, 3, 2],
      [3, 2, 1, 0, 1],
      [0, 1, 2, 3, 3],
      [3, 2, 1, 0, 0],
      [0, 1, 0, 1, 0],
      [3, 2, 3, 2, 3],
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],
      [1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2],
      [0, 0, 1, 2, 3],
      [3, 3, 2, 1, 0],
      [0, 1, 1, 2, 2],
      [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3]
    ],

    spinDuration: 1500
  }

};

module.exports = slotsConfig;
