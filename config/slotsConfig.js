const slotsConfig = {
  ClassicSlot: {
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
      cherry: 50, lemon: 35, orange: 25, watermelon: 15, grapes: 10,
      star: 8, red7: 3, diamond: 3, bar: 2, jackpot: 1
    },
    paylines: [
      // 1-4: horizontal lines
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],

      // 5-12: simple V / inverted V / zigzags
      [0, 1, 2, 1, 0],
      [3, 2, 1, 2, 3],
      [1, 0, 0, 0, 1],
      [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0],
      [3, 3, 2, 3, 3],
      [0, 1, 1, 1, 0],
      [3, 2, 2, 2, 3],

      // 13-20: diagonals across
      [0, 1, 2, 3, 3],
      [3, 2, 1, 0, 0],
      [0, 1, 2, 3, 2],
      [3, 2, 1, 0, 1],
      [1, 2, 3, 3, 3],
      [2, 1, 0, 0, 0],
      [1, 1, 2, 1, 1],
      [2, 2, 1, 2, 2],

      // 21-28: extended zigzags / double dips
      [0, 1, 0, 1, 0],
      [3, 2, 3, 2, 3],
      [0, 2, 0, 2, 0],
      [3, 1, 3, 1, 3],
      [1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2],
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],

      // 29-36: ladder / step patterns
      [0, 0, 1, 2, 3],
      [3, 3, 2, 1, 0],
      [1, 1, 0, 1, 2],
      [2, 2, 3, 2, 1],
      [0, 1, 1, 2, 2],
      [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3],
      [2, 1, 1, 0, 0],

      // 37-40: mixed S / small diagonals
      [0, 1, 1, 0, 1],
      [3, 2, 2, 3, 2],
      [0, 1, 2, 1, 2],
      [3, 2, 1, 2, 1]
    ],
    spinDuration: 1500
  },

  PharaohsRiches: {
    symbols: [
      { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png', multiplier: 10 },
      { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png', multiplier: 8 },
      { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png', multiplier: 4 },
      { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png', multiplier: 3 },
      { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png', multiplier: 5 },
      { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png', multiplier: 2 },
      { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png', multiplier: 7 },
      { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png', multiplier: 3 },
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 100 }
    ],

    reels: 5,
    rows: 4,

    // 🧩 FIXED CHANCES — same multipliers, just better balancing
    symbolChances: {
      goldCoin: 28,          // more frequent small win
      scarab: 18,            // moderate win
      hieroglyphScroll: 15,  // balanced mid symbol
      ankh: 12,              // less common
      pyramid: 8,            // moderate
      sphinx: 5,             // rarer
      pharaoh: 3,            // big win symbol
      treasureChest: 3,      // rare high symbol
      ra: 0.5                // ultra-rare jackpot (1 in 200)
    },

    paylines: [
      // 1-4: horizontal lines
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
      [3, 3, 3, 3, 3],

      // 5-12: simple V / inverted V / zigzags
      [0, 1, 2, 1, 0],
      [3, 2, 1, 2, 3],
      [1, 0, 0, 0, 1],
      [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0],
      [3, 3, 2, 3, 3],
      [0, 1, 1, 1, 0],
      [3, 2, 2, 2, 3],

      // 13-20: diagonals across
      [0, 1, 2, 3, 3],
      [3, 2, 1, 0, 0],
      [0, 1, 2, 3, 2],
      [3, 2, 1, 0, 1],
      [1, 2, 3, 3, 3],
      [2, 1, 0, 0, 0],
      [1, 1, 2, 1, 1],
      [2, 2, 1, 2, 2],

      // 21-28: extended zigzags / double dips
      [0, 1, 0, 1, 0],
      [3, 2, 3, 2, 3],
      [0, 2, 0, 2, 0],
      [3, 1, 3, 1, 3],
      [1, 0, 1, 0, 1],
      [2, 3, 2, 3, 2],
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],

      // 29-36: ladder / step patterns
      [0, 0, 1, 2, 3],
      [3, 3, 2, 1, 0],
      [1, 1, 0, 1, 2],
      [2, 2, 3, 2, 1],
      [0, 1, 1, 2, 2],
      [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3],
      [2, 1, 1, 0, 0],

      // 37-40: mixed S / small diagonals
      [0, 1, 1, 0, 1],
      [3, 2, 2, 3, 2],
      [0, 1, 2, 1, 2],
      [3, 2, 1, 2, 1]
    ],
    spinDuration: 1500
  }
};

module.exports = slotsConfig;
