// config/slotsConfig.js
const slotsConfig = {
  ClassicSlot: {
    // ADJUSTED MULTIPLIERS FOR PROFITABILITY
    symbols: [
      { name: 'cherry', file: '/images/ClassicSlot/cherry.png', multiplier: 0.8 }, // Reduced
      { name: 'lemon', file: '/images/ClassicSlot/lemon.png', multiplier: 1 },
      { name: 'orange', file: '/images/ClassicSlot/orange.png', multiplier: 1.2 },  // Reduced
      { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png', multiplier: 1.8 }, // Reduced
      { name: 'grapes', file: '/images/ClassicSlot/grapes.png', multiplier: 3 },   // Reduced
      { name: 'star', file: '/images/ClassicSlot/star.png', multiplier: 4 },      // Reduced
      { name: 'red7', file: '/images/ClassicSlot/red7.png', multiplier: 10 },     // Reduced
      { name: 'diamond', file: '/images/ClassicSlot/diamond.png', multiplier: 8 },
      { name: 'bar', file: '/images/ClassicSlot/bar.png', multiplier: 20 },
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 100 },
    ],

    reels: 5,
    rows: 4,

    // ADJUSTED CHANCES TO REDUCE FREQUENCY OF BIG WINS
    symbolChances: {
      cherry: 50, lemon: 35, orange: 25, watermelon: 15, grapes: 10,
      star: 8, red7: 3, diamond: 3, bar: 2, jackpot: 1 // High-payers significantly reduced
    },

    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3],
      [1, 2, 3, 2, 1], [2, 1, 0, 1, 2],
      [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
      [0, 0, 1, 1, 2], [3, 3, 2, 2, 1]
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
    symbolChances: {
      pharaoh: 3, sphinx: 4, ankh: 10, scarab: 15,
      pyramid: 8, goldCoin: 20, treasureChest: 6, hieroglyphScroll: 15, ra: 1
    },
    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3],
      [1, 2, 3, 2, 1], [2, 1, 0, 1, 2]
    ],
    spinDuration: 1500
  }
};

module.exports = slotsConfig;