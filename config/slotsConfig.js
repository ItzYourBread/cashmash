const slotsConfig = {
  ClassicSlot: {
    // 🎯 Balanced 30% Win / 70% Lose
    baseWinRate: {
      MIN: 0.9,
      MAX: 0.1
    },
    symbols: [
      { name: 'cherry', file: '/images/ClassicSlot/cherry.png', multiplier: 0.5 },
      { name: 'lemon', file: '/images/ClassicSlot/lemon.png', multiplier: 0.7 },
      { name: 'orange', file: '/images/ClassicSlot/orange.png', multiplier: 0.8 },
      { name: 'watermelon', file: '/images/ClassicSlot/watermelon.png', multiplier: 1.0 },
      { name: 'grapes', file: '/images/ClassicSlot/grapes.png', multiplier: 1.5 },
      { name: 'star', file: '/images/ClassicSlot/star.png', multiplier: 2.0 },
      { name: 'diamond', file: '/images/ClassicSlot/diamond.png', multiplier: 3.0 },
      { name: 'red7', file: '/images/ClassicSlot/red7.png', multiplier: 4.0 },
      { name: 'bar', file: '/images/ClassicSlot/bar.png', multiplier: 6.0 },
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 10.0 }
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      cherry: 18,
      lemon: 16,
      orange: 14,
      watermelon: 12,
      grapes: 10,
      star: 8,
      diamond: 7,
      red7: 6,
      bar: 5,
      jackpot: 4
    },
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
      [1, 2, 1, 2, 1],
      [2, 1, 2, 1, 2],
      [0, 0, 1, 2, 3],
      [3, 3, 2, 1, 0],
      [0, 1, 1, 2, 2],
      [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3],
      [2, 1, 1, 0, 0]
    ],
    spinDuration: 1500
  },

  PharaohsRiches: {
    // 🌟 Low-Medium Volatility (More frequent smaller wins)
    baseWinRate: {
      MIN: 0.3,
      MAX: 0.7
    },
    symbols: [
      { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png', multiplier: 0.6 },
      { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png', multiplier: 0.9 },
      { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png', multiplier: 1.2 },
      { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png', multiplier: 1.5 },
      { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png', multiplier: 2.0 },
      { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png', multiplier: 2.5 },
      { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png', multiplier: 3.0 },
      { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png', multiplier: 4.0 },
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 6.0 }
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      goldCoin: 17,
      scarab: 15,
      hieroglyphScroll: 13,
      ankh: 12,
      pyramid: 11,
      treasureChest: 10,
      sphinx: 9,
      pharaoh: 7,
      ra: 6
    },
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
  },

  DragonBlaze: {
    // 🔥 Medium-High Volatility, 30/70 Win Ratio
    baseWinRate: {
      MIN: 0.3,
      MAX: 0.7
    },
    symbols: [
      { name: 'emberCoin', file: '/images/DragonBlazeSlots/emberCoin.png', multiplier: 0.5 },
      { name: 'fireRune', file: '/images/DragonBlazeSlots/fireRune.png', multiplier: 0.8 },
      { name: 'flameSword', file: '/images/DragonBlazeSlots/flameSword.png', multiplier: 1.2 },
      { name: 'lavaShield', file: '/images/DragonBlazeSlots/lavaShield.png', multiplier: 1.8 },
      { name: 'dragonEye', file: '/images/DragonBlazeSlots/dragonEye.png', multiplier: 2.5 },
      { name: 'phoenixFeather', file: '/images/DragonBlazeSlots/phoenixFeather.png', multiplier: 3.0 },
      { name: 'blazeCrown', file: '/images/DragonBlazeSlots/blazeCrown.png', multiplier: 3.5 },
      { name: 'goldenDragon', file: '/images/DragonBlazeSlots/goldenDragon.png', multiplier: 4.0 },
      { name: 'dragonBlaze', file: '/images/DragonBlazeSlots/dragonBlaze.png', multiplier: 5.0 }
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      emberCoin: 18,
      fireRune: 14,
      flameSword: 12,
      lavaShield: 11,
      dragonEye: 10,
      phoenixFeather: 9,
      blazeCrown: 8,
      goldenDragon: 9,
      dragonBlaze: 9
    },
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
