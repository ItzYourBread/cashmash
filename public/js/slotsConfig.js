// slotsConfig.js (The file you are exporting)

// 1. Define the configuration object using 'const'
const slotsConfig = {
  SlotsClassic: {
    symbols: [
      { name: 'cherry', file: '/images/SlotsClassic/cherry.png', multiplier: 2 },
      { name: 'lemon', file: '/images/SlotsClassic/lemon.png', multiplier: 2 },
      { name: 'orange', file: '/images/SlotsClassic/orange.png', multiplier: 3 },
      { name: 'watermelon', file: '/images/SlotsClassic/watermelon.png', multiplier: 3 },
      { name: 'grapes', file: '/images/SlotsClassic/grapes.png', multiplier: 4 },
      { name: 'star', file: '/images/SlotsClassic/star.png', multiplier: 5 },
      { name: 'red7', file: '/images/SlotsClassic/red7.png', multiplier: 10 },
      { name: 'diamond', file: '/images/SlotsClassic/diamond.png', multiplier: 8 },
      { name: 'bar', file: '/images/SlotsClassic/bar.png', multiplier: 6 },
      { name: 'jackpot', file: '/images/SlotsClassic/jackpot.png', multiplier: 12 },
    ],

    reels: 5,
    rows: 4,

    // Chance configuration: higher = more frequent
    symbolChances: {
      cherry: 100,
      lemon: 15,
      orange: 12,
      watermelon: 12,
      grapes: 10,
      star: 8,
      red7: 5,
      diamond: 7,
      bar: 8,
      jackpot: 3
    },

    paylines: [
      // Horizontal lines only
      [0,0,0,0,0],
      [1,1,1,1,1],
      [2,2,2,2,2],
      [3,3,3,3,3],
      // Diagonal lines
      [0,1,2,1,0],
      [3,2,1,2,3]
    ],

    // Spin animation config
    spinDuration: 1500 // in milliseconds
  }

  // Later you can add more slot machines:
  // , SlotsMega: { symbols: [...], reels: 6, rows: 4, ... }
};

// 2. Export the object using the standard ES Module syntax
export default slotsConfig;