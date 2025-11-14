const slotsConfig = {
  ClassicSlot: {
    title: "Classic",
    theme: `
      /* Classic Slot — No Theme */
    `,
    minBet: 75,
    maxBet: 5000,
    description: "A timeless slot experience with bright fruits and simple wins!",
    bonusInfo: "No bonus round — pure old-school fun and clean wins!",

    baseWinRate: { MIN: 0.9, MAX: 0.1 },

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
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 10.0 },
    ],

    reels: 5,
    rows: 4,

    symbolChances: {
      cherry: 18, lemon: 16, orange: 14, watermelon: 12,
      grapes: 10, star: 8, diamond: 7, red7: 6, bar: 5, jackpot: 4,
    },

    paylines: [
      [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], [3,3,3,3,3],
      [0,1,2,1,0], [3,2,1,2,3],
      [1,0,0,0,1], [2,3,3,3,2],
      [0,0,1,0,0], [3,3,2,3,3],
      [0,1,2,3,2], [3,2,1,0,1],
      [1,2,1,2,1], [2,1,2,1,2],
      [0,0,1,2,3], [3,3,2,1,0],
      [0,1,1,2,2], [3,2,2,1,1],
      [1,2,2,3,3], [2,1,1,0,0],
    ],

    spinDuration: 1500
  },

  /* -------------------------------------------------------------------------- */
  /*                             PHARAOH'S RICHES                               */
  /* -------------------------------------------------------------------------- */

  PharaohsRiches: {
    title: "Pharaoh’s Riches",
    theme: `
      /* ===================== PHARAOH'S RICHES THEME ===================== */

      body {
        margin: 0;
        background: radial-gradient(circle at center, #4d2c00 10%, #1a0d00 100%);
        color: #f5e1b8;
        overflow-x: hidden;
      }

      .modal-content {
        background: linear-gradient(145deg, rgba(60,40,10,0.97), rgba(30,20,5,0.95));
        border: 2px solid rgba(255,215,120,0.6);
        box-shadow: 0 0 35px rgba(255,200,50,0.3),
                    inset 0 0 20px rgba(255,215,120,0.1);
        border-radius: 18px;
        padding: 36px 42px;
        width: 480px;
        max-width: 90%;
        text-align: left;
        position: relative;
        overflow-y: auto;
        max-height: 85vh;
      }

      .close-btn {
        position: absolute;
        top: 14px;
        right: 18px;
        font-size: 1.8em;
        color: #ffd780;
        cursor: pointer;
        transition: 0.3s;
      }

      .modal-content h2 {
        text-align: center;
        color: #ffd680;
        font-size: 1.8em;
        margin-bottom: 16px;
      }

      .modal-content li {
        color: #f5e1b8;
        margin-bottom: 10px;
        border-left: 3px solid rgba(255,200,50,0.5);
        padding-left: 12px;
      }
    `,

    minBet: 200,
    maxBet: 10000,
    description: "Uncover treasures in the golden sands of the Nile.",
    bonusInfo: "Every Pharaoh gives +5% bet bonus instantly.",

    baseWinRate: { MIN: 0.3, MAX: 0.7 },

    symbols: [
      { name: 'goldCoin', file: '/images/PharaohsRichesSlots/goldCoin.png', multiplier: 0.6 },
      { name: 'scarab', file: '/images/PharaohsRichesSlots/scarab.png', multiplier: 0.9 },
      { name: 'hieroglyphScroll', file: '/images/PharaohsRichesSlots/hieroglyphScroll.png', multiplier: 1.2 },
      { name: 'ankh', file: '/images/PharaohsRichesSlots/ankh.png', multiplier: 1.5 },
      { name: 'pyramid', file: '/images/PharaohsRichesSlots/pyramid.png', multiplier: 2.0 },
      { name: 'treasureChest', file: '/images/PharaohsRichesSlots/treasureChest.png', multiplier: 2.5 },
      { name: 'sphinx', file: '/images/PharaohsRichesSlots/sphinx.png', multiplier: 3.0 },
      { name: 'pharaoh', file: '/images/PharaohsRichesSlots/pharaoh.png', multiplier: 4.0 },
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 10.0 },
    ],

    reels: 5,
    rows: 4,

    symbolChances: {
      goldCoin: 17, scarab: 15, hieroglyphScroll: 13,
      ankh: 12, pyramid: 11, treasureChest: 10,
      sphinx: 9, pharaoh: 7, ra: 6,
    },

    paylines: [
      [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], [3,3,3,3,3],
      [0,1,2,1,0], [3,2,1,2,3], [1,0,0,0,1], [2,3,3,3,2],
      [0,0,1,0,0], [3,3,2,3,3], [0,1,2,3,2], [3,2,1,0,1],
      [0,1,2,3,3], [3,2,1,0,0], [0,1,0,1,0], [3,2,3,2,3],
      [1,2,1,2,1], [2,1,2,1,2], [1,0,1,0,1], [2,3,2,3,2],
      [0,0,1,2,3], [3,3,2,1,0], [0,1,1,2,2], [3,2,2,1,1],
      [1,2,2,3,3]
    ],

    spinDuration: 1500
  },

  /* -------------------------------------------------------------------------- */
  /*                                DRAGON BLAZE                                */
  /* -------------------------------------------------------------------------- */

  DragonBlaze: {
    title: "Dragon Blaze",
    theme: `
      /* ===================== DRAGON BLAZE THEME ===================== */

      body {
        margin: 0;
        background: radial-gradient(circle at center, #1a0000 10%, #0a0000 100%);
        color: #f9e8c3;
        overflow-x: hidden;
      }

      .modal-content {
        background: linear-gradient(145deg, rgba(30,0,0,0.98), rgba(10,0,0,0.96));
        border: 2px solid rgba(255,140,0,0.6);
        padding: 40px 48px;
        max-width: 90%;
        width: 480px;
        border-radius: 20px;
      }

      .close-btn {
        top: 14px;
        right: 18px;
        font-size: 1.8em;
        color: #ffbb55;
        cursor: pointer;
        position: absolute;
        transition: 0.3s;
      }

      .modal-content h2 {
        text-align: center;
        color: #ffd85f;
        font-size: 1.8em;
        margin-bottom: 16px;
      }
    `,

    minBet: 400,
    maxBet: 10000,
    description: "Feel the flames — unleash blazing wins and fire bonuses.",
    bonusInfo: "Dragon Eye grants +10% bet bonus instantly.",

    baseWinRate: { MIN: 0.3, MAX: 0.7 },

    symbols: [
      { name: 'emberCoin', file: '/images/DragonBlazeSlots/emberCoin.png', multiplier: 0.5 },
      { name: 'fireRune', file: '/images/DragonBlazeSlots/fireRune.png', multiplier: 0.8 },
      { name: 'flameSword', file: '/images/DragonBlazeSlots/flameSword.png', multiplier: 1.2 },
      { name: 'lavaShield', file: '/images/DragonBlazeSlots/lavaShield.png', multiplier: 1.8 },
      { name: 'dragonEye', file: '/images/DragonBlazeSlots/dragonEye.png', multiplier: 2.5 },
      { name: 'phoenixFeather', file: '/images/DragonBlazeSlots/phoenixFeather.png', multiplier: 3.0 },
      { name: 'blazeCrown', file: '/images/DragonBlazeSlots/blazeCrown.png', multiplier: 3.5 },
      { name: 'goldenDragon', file: '/images/DragonBlazeSlots/goldenDragon.png', multiplier: 4.0 },
      { name: 'dragonBlaze', file: '/images/DragonBlazeSlots/dragonBlaze.png', multiplier: 12.0 },
    ],

    reels: 5,
    rows: 4,

    symbolChances: {
      emberCoin: 18, fireRune: 14, flameSword: 12,
      lavaShield: 11, dragonEye: 10, phoenixFeather: 9,
      blazeCrown: 8, goldenDragon: 9, dragonBlaze: 9,
    },

    paylines: [
      [0,0,0,0,0], [1,1,1,1,1], [2,2,2,2,2], [3,3,3,3,3],
      [0,1,2,1,0], [3,2,1,2,3], [1,0,0,0,1], [2,3,3,3,2],
      [0,0,1,0,0], [3,3,2,3,3], [0,1,2,3,2], [3,2,1,0,1],
      [0,1,2,3,3], [3,2,1,0,0], [0,1,0,1,0], [3,2,3,2,3],
      [1,2,1,2,1], [2,1,2,1,2], [1,0,1,0,1], [2,3,2,3,2],
      [0,0,1,2,3], [3,3,2,1,0], [0,1,1,2,2], [3,2,2,1,1],
      [1,2,2,3,3],
    ],

    spinDuration: 1500
  }
};

module.exports = slotsConfig;
