const slotsConfig = {
  /* -------------------------------------------------------------------------- */
  /* CLASSIC SLOT                                */
  /* -------------------------------------------------------------------------- */
  ClassicSlot: {
    title: "Classic",
    theme: `/* Classic Slot — No Theme */`,
    minBet: 0.1,
    maxBet: 100,
    description: "A timeless slot experience with bright fruits and simple wins!",
    bonusInfo: "No bonus round — pure old-school fun and clean wins!",
    baseWinRate: { MIN: 0.7, MAX: 0.3 },

    // --- NEW: Classic Casino Confetti ---
    particleTheme: {
      shape: 'circle',
      colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'], // Multi-colored confetti
      count: 60,
      gravity: 0.25, // Standard fall
      speedY: { min: -12, max: -6 }, // High explosion
      speedX: { min: -4, max: 4 },
      size: { min: 4, max: 7 },
      life: 0.02 // Disappear normally
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
      { name: 'jackpot', file: '/images/ClassicSlot/jackpot.png', multiplier: 10.0 },
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      cherry: 18, lemon: 16, orange: 14, watermelon: 12,
      grapes: 10, star: 8, diamond: 7, red7: 6, bar: 5, jackpot: 4,
    },
    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3],
      [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0], [3, 3, 2, 3, 3],
      [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
      [1, 2, 1, 2, 1], [2, 1, 2, 1, 2],
      [0, 0, 1, 2, 3], [3, 3, 2, 1, 0],
      [0, 1, 1, 2, 2], [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3], [2, 1, 1, 0, 0],
    ],
    spinDuration: 1500
  },

  /* -------------------------------------------------------------------------- */
  /* PHARAOH'S RICHES                               */
  /* -------------------------------------------------------------------------- */
  PharaohsRiches: {
    title: "Pharaoh’s Riches",
    theme: `
      body { margin: 0; background: radial-gradient(circle at center, #4d2c00 10%, #1a0d00 100%); color: #f5e1b8; overflow-x: hidden; }
      .grid-wrapper { background: linear-gradient(145deg, #4d2c00, #1a0d00); border: 1px solid rgba(255, 215, 120, 0.5); box-shadow: 0 10px 30px rgba(255, 200, 80, 0.35); }
      .modal-content { background: linear-gradient(145deg, rgba(60,40,10,0.97), rgba(30,20,5,0.95)); border: 2px solid rgba(255,215,120,0.6); box-shadow: 0 0 35px rgba(255,200,50,0.3), inset 0 0 20px rgba(255,215,120,0.1); border-radius: 18px; padding: 36px 42px; width: 480px; max-width: 90%; text-align: left; position: relative; overflow-y: auto; max-height: 85vh; }
      .close-btn { position: absolute; top: 14px; right: 18px; font-size: 1.8em; color: #ffd780; cursor: pointer; transition: 0.3s; }
      .modal-content h2 { text-align: center; color: #ffd680; font-size: 1.8em; margin-bottom: 16px; }
      .modal-content li { color: #f5e1b8; margin-bottom: 10px; border-left: 3px solid rgba(255,200,50,0.5); padding-left: 12px; }
    `,
    minBet: 0.1,
    maxBet: 100,
    description: "Uncover treasures in the golden sands of the Nile.",
    bonusInfo: "Every Pharaoh gives +5% bet bonus instantly.",
    baseWinRate: { MIN: 0.7, MAX: 0.3 },

    // --- NEW: Heavy Gold Coin Shower ---
    particleTheme: {
      shape: 'rect', // Looks like gold bars/bricks spinning
      colors: ['#FFD700', '#DAA520', '#B8860B'], // Gold shades
      count: 80,
      gravity: 0.4, // Heavy gravity (gold is heavy)
      speedY: { min: -10, max: -5 },
      speedX: { min: -6, max: 6 },
      size: { min: 5, max: 8 },
      life: 0.015
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
      { name: 'ra', file: '/images/PharaohsRichesSlots/ra.png', multiplier: 10.0 },
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      goldCoin: 17, scarab: 14, hieroglyphScroll: 12,
      ankh: 11, pyramid: 10, treasureChest: 9,
      sphinx: 8, pharaoh: 6, ra: 4,
    },
    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0], [3, 3, 2, 3, 3], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
      [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
      [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2],
      [0, 0, 1, 2, 3], [3, 3, 2, 1, 0], [0, 1, 1, 2, 2], [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3]
    ],
    spinDuration: 1500
  },

  /* -------------------------------------------------------------------------- */
  /* DRAGON BLAZE                                */
  /* -------------------------------------------------------------------------- */
  DragonBlaze: {
    title: "Dragon Blaze",
    theme: `
      body { margin: 0; background: radial-gradient(circle at center, #1a0000 10%, #0a0000 100%); color: #f9e8c3; overflow-x: hidden; }
      .grid-wrapper { background: linear-gradient(145deg, #2a0000, #0a0000); border: 1px solid rgba(255, 80, 0, 0.5); box-shadow: 0 10px 30px rgba(255, 80, 0, 0.4); }
      .modal-content { background: linear-gradient(145deg, rgba(30,0,0,0.98), rgba(10,0,0,0.96)); border: 2px solid rgba(255,140,0,0.6); padding: 40px 48px; max-width: 90%; width: 480px; border-radius: 20px; }
      .close-btn { top: 14px; right: 18px; font-size: 1.8em; color: #ffbb55; cursor: pointer; position: absolute; transition: 0.3s; }
      .modal-content h2 { text-align: center; color: #ffd85f; font-size: 1.8em; margin-bottom: 16px; }
    `,
    minBet: 0.1,
    maxBet: 100,
    description: "Feel the flames — unleash blazing wins and fire bonuses.",
    bonusInfo: "Dragon Eye grants +10% bet bonus instantly.",
    baseWinRate: { MIN: 0.7, MAX: 0.3 },

    // --- UPDATED: Dragon's Breath Inferno ---
    particleTheme: {
      shape: 'circle',
      // Color Palette: White (hot core) -> Gold -> Orange -> Red -> Dark Red (cooling ash)
      colors: ['#FFFFFF', '#FFF700', '#FFD700', '#FF4500', '#8B0000', '#420000'],
      count: 120,          // Higher count for a dense blast
      gravity: -0.2,       // Strong negative gravity (accelerates UP)
      speedY: { min: -12, max: -5 }, // FAST initial upward burst (Negative Y = Up)
      speedX: { min: -5, max: 5 },   // Wide chaotic spread
      size: { min: 1, max: 6 },      // Mix of tiny sparks and large embers
      life: 0.025          // fast decay for a flickering effect
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
      { name: 'dragonBlaze', file: '/images/DragonBlazeSlots/dragonBlaze.png', multiplier: 12.0 },
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      emberCoin: 17, fireRune: 14, flameSword: 12,
      lavaShield: 11, dragonEye: 10, phoenixFeather: 9,
      blazeCrown: 8, goldenDragon: 6, dragonBlaze: 4,
    },
    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0], [3, 3, 2, 3, 3], [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
      [0, 1, 2, 3, 3], [3, 2, 1, 0, 0], [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
      [1, 2, 1, 2, 1], [2, 1, 2, 1, 2], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2],
      [0, 0, 1, 2, 3], [3, 3, 2, 1, 0], [0, 1, 1, 2, 2], [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3],
    ],
    spinDuration: 1500
  },

  /* -------------------------------------------------------------------------- */
  /* WINTER 2025                                 */
  /* -------------------------------------------------------------------------- */
  Winter2025: {
    title: "Winter 2025",
    theme: `
      body { margin: 0; background: radial-gradient(circle at center, #0e1a27 10%, #02070d 100%); color: #e9f6ff; overflow-x: hidden; }
      .grid-wrapper { background: linear-gradient(145deg, #0d1b29, #07101a); border: 1px solid rgba(180, 220, 255, 0.35); box-shadow: 0 10px 35px rgba(120, 180, 255, 0.35), inset 0 0 25px rgba(120, 170, 255, 0.15); backdrop-filter: blur(3px); }
      .modal-content { background: linear-gradient(145deg, rgba(12,18,28,0.96), rgba(6,12,20,0.94)); border: 2px solid rgba(170,210,255,0.55); box-shadow: 0 0 40px rgba(130,180,255,0.25), inset 0 0 20px rgba(180,210,255,0.15); backdrop-filter: blur(6px); border-radius: 20px; padding: 40px 48px; width: 480px; max-width: 90%; max-height: 85vh; overflow-y: auto; position: relative; }
      .close-btn { position: absolute; top: 14px; right: 16px; font-size: 1.8em; color: #cfe8ff; cursor: pointer; transition: 0.3s; }
      .modal-content h2 { text-align: center; color: #d6edff; font-size: 1.8em; margin-bottom: 16px; }
      .modal-content li { margin-bottom: 10px; color: #e9f6ff; border-left: 3px solid rgba(180,220,255,0.55); padding-left: 12px; }
      .btn-action{width:100%;padding:18px;border-radius:15px;border:none;font-weight:700;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:.3s all;box-shadow:0 5px 20px rgba(0,0,0,.35);background:linear-gradient(135deg,#c9e8ff,#7fc8f7,#4aa3e6);background-size:220% 220%;color:#042033;text-shadow:0 0 6px rgba(255,255,255,.35),0 0 12px rgba(180,220,255,.4)}.btn-action:hover{transform:translateY(-2px);box-shadow:0 0 25px rgba(180,220,255,.7),0 0 40px rgba(110,170,255,.5);background-position:100% 0;filter:brightness(1.12)}
    `,
    minBet: 0.1,
    maxBet: 100,
    description: "A frosty wonderland filled with holiday magic, cold treasures, and seasonal rewards.",
    bonusInfo: "Snowflake gives +5% winter bonus; North Star gives +10% bet bonus.",
    baseWinRate: { MIN: 0.7, MAX: 0.3 },
    particleTheme: {
      shape: 'snowflake',
      colors: ['#FFFFFF', '#E8F9FF', '#CFEFFF'], // Softer natural tones
      count: 50,                      // Slightly more to fill screen naturally
      gravity: 0.02,                  // Very light pull (long fall)
      speedY: { min: 0.4, max: 1.2 }, // Slow descent
      speedX: { min: -0.8, max: 0.8 },// Gentle horizontal drift
      size: { min: 5, max: 9 },       // Slightly larger so slow feels natural
      life: 0.0025                    // Very long lifespan (slow fade)
    },
    symbols: [
      { name: 'snowball', file: '/images/Winter2025Slots/snowball.png', multiplier: 0.5 },
      { name: 'mittens', file: '/images/Winter2025Slots/mittens.png', multiplier: 0.7 },
      { name: 'iceCrystal', file: '/images/Winter2025Slots/iceCrystal.png', multiplier: 1.2 },
      { name: 'candyCane', file: '/images/Winter2025Slots/candyCane.png', multiplier: 1.5 },
      { name: 'snowman', file: '/images/Winter2025Slots/snowman.png', multiplier: 2.0 },
      { name: 'northStar', file: '/images/Winter2025Slots/northStar.png', multiplier: 2.5 },
      { name: 'snowflake', file: '/images/Winter2025Slots/snowflake.png', multiplier: 3.0 },
      { name: 'reindeer', file: '/images/Winter2025Slots/reindeer.png', multiplier: 4.0 },
      { name: 'winterJackpot', file: '/images/Winter2025Slots/winterJackpot.png', multiplier: 8.0 },
    ],
    reels: 5,
    rows: 4,
    symbolChances: {
      snowball: 18, mittens: 14, iceCrystal: 12, candyCane: 11,
      snowman: 10, northStar: 9, snowflake: 8, reindeer: 6, winterJackpot: 4,
    },
    paylines: [
      [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
      [0, 1, 2, 1, 0], [3, 2, 1, 2, 3],
      [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
      [0, 0, 1, 0, 0], [3, 3, 2, 3, 3],
      [0, 1, 2, 3, 2], [3, 2, 1, 0, 1],
      [1, 2, 1, 2, 1], [2, 1, 2, 1, 2],
      [0, 0, 1, 2, 3], [3, 3, 2, 1, 0],
      [0, 1, 1, 2, 2], [3, 2, 2, 1, 1],
      [1, 2, 2, 3, 3], [2, 1, 1, 0, 0],
      [0, 1, 0, 1, 0], [3, 2, 3, 2, 3],
      [1, 0, 1, 0, 1], [2, 3, 2, 3, 2],
      [0, 1, 2, 3, 3]
    ],
    spinDuration: 1500
  }
};

module.exports = slotsConfig;