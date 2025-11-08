// controllers/slotsController.js
const slotsConfig = require('../config/slotsConfig.js');
const User = require('../models/User');

let slotType = 'ClassicSlot';

const setSlotType = (req) => {
  const type = req.query.type;
  if (type && slotsConfig[type]) slotType = type;
};

// --- CONFIG ---
const TARGET_RTP = 0.92;
const HOUSE_EDGE = 1 - TARGET_RTP;
const PAYOUT_FACTORS = { 3: 1.0, 4: 3.0, 5: 5.0 };

// --- DYNAMIC CONFIGURATION ---
const getDynamicConfig = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const baseConfig = slotsConfig[slotType];
  let payoutBoostFactor = 1.0;

  if (dayOfWeek === 0 || dayOfWeek === 1) payoutBoostFactor = 1.1; // Lucky Day

  const houseAdjustment = 1 - (HOUSE_EDGE / 2);
  const dynamicSymbols = baseConfig.symbols.map(sym => ({
    ...sym,
    multiplier: sym.multiplier * payoutBoostFactor * houseAdjustment
  }));

  return { ...baseConfig, symbols: dynamicSymbols, isLuckyDay: payoutBoostFactor > 1.0 };
};

const getRandomSymbol = (config) => {
  const weighted = [];
  config.symbols.forEach(sym => {
    const weight = config.symbolChances?.[sym.name] || 1;
    for (let i = 0; i < weight; i++) weighted.push(sym);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
};

// --- Winnings Calculation ---
const calculateWinnings = (symbolsMatrix, bet, config) => {
  let totalWin = 0;
  const finalSymbols = symbolsMatrix.map(reel => reel.map(sym => ({ ...sym, win: false })));

  const validPaylines = (config.paylines || []).filter(line =>
    Array.isArray(line) &&
    line.length === config.reels &&
    line.every(rowIndex => Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < config.rows)
  );

  validPaylines.forEach(line => {
    let winLength = 0;
    let currentSymbolName = null;
    let winningSymbol = null;

    for (let reelIndex = 0; reelIndex < config.reels; reelIndex++) {
      const rowIndex = line[reelIndex];
      if (!symbolsMatrix[reelIndex] || !symbolsMatrix[reelIndex][rowIndex]) {
        winLength = 0;
        break;
      }

      const symbol = symbolsMatrix[reelIndex][rowIndex];

      if (reelIndex === 0) {
        currentSymbolName = symbol.name;
        winningSymbol = symbol;
        winLength = 1;
      } else if (symbol.name === currentSymbolName) {
        winLength++;
      } else break;
    }

    if (winLength >= 3) {
      const factor = PAYOUT_FACTORS[winLength] || 0;
      const lineWin = bet * (winningSymbol?.multiplier || 0) * factor;
      totalWin += lineWin;

      for (let reelIndex = 0; reelIndex < winLength; reelIndex++) {
        const rowIndex = line[reelIndex];
        if (finalSymbols[reelIndex] && finalSymbols[reelIndex][rowIndex]) {
          finalSymbols[reelIndex][rowIndex].win = true;
        }
      }
    }
  });

  return { totalWin, finalSymbols };
};

// --- Generate Losing Matrix ---
const generateLosingMatrix = (config) => {
  const matrix = Array(config.reels).fill(0).map(() => Array(config.rows).fill(0).map(() => {
    const sym = getRandomSymbol(config);
    return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
  }));

  const { totalWin, finalSymbols } = calculateWinnings(matrix, 1, config);
  if (totalWin > 0) return generateLosingMatrix(config);
  return { matrix, finalSymbols, totalWin: 0 };
};

// --- MAIN SPIN ---
exports.spin = async (req, res) => {
  let user;
  const bet = parseInt(req.body.bet, 10);

  try {
    setSlotType(req);
    const config = getDynamicConfig();
    const userId = req.user.id;

    if (!bet || bet < 1) return res.status(400).json({ error: 'Invalid bet' });

    user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (bet > user.chips) return res.status(400).json({ error: 'Insufficient balance' });

    user.chips -= bet;

    user.losingStreak = user.losingStreak || 0;
    user.comebackSpinsLeft = user.comebackSpinsLeft || 0;
    user.spinsSinceLastSmallWin = user.spinsSinceLastSmallWin || 0;
    user.spinsSinceLastSmallWin++;
    user.totalWagered = (user.totalWagered || 0) + bet;

    // --- Generate initial symbols ---
    const symbolsMatrix = Array(config.reels).fill(0).map(() => Array(config.rows).fill(0).map(() => {
      const sym = getRandomSymbol(config);
      return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
    }));

    let { totalWin, finalSymbols } = calculateWinnings(symbolsMatrix, bet, config);

    // --- Dragon Eye Bonus ---
    let dragonEyeBonus = 0;
    finalSymbols.forEach(reelSymbols => {
      reelSymbols.forEach(symbol => {
        if (symbol.name === 'dragonEye') {
          dragonEyeBonus += bet * 0.10; // 10% of bet per dragonEye
        }
      });
    });
    totalWin += dragonEyeBonus; // add to total win

    // --- RNG & Win Logic ---
    const minRate = Math.min(config.baseWinRate.MIN, config.baseWinRate.MAX);
    const maxRate = Math.max(config.baseWinRate.MIN, config.baseWinRate.MAX);
    let winThreshold = minRate + Math.random() * ((maxRate - minRate) || 0.0001);

    if (user.comebackSpinsLeft > 0) {
      winThreshold += 0.15 + Math.random() * 0.15;
      user.comebackSpinsLeft--;
    }
    winThreshold = Math.min(Math.max(winThreshold, 0.01), 0.99);

    const winRoll = Math.random();
    let isForcedWin = false;

    // --- Forced small win every 10 spins ---
    if (user.spinsSinceLastSmallWin >= 10 && totalWin === 0) {
      const smallSymbols = config.symbols.filter(s => s.multiplier <= 1.5);
      if (smallSymbols.length > 0) {
        const winningSymbol = smallSymbols[Math.floor(Math.random() * smallSymbols.length)];
        const line = config.paylines[Math.floor(Math.random() * config.paylines.length)];

        if (line.every(rowIndex => rowIndex < config.rows)) {
          for (let r = 0; r < 3; r++) {
            symbolsMatrix[r][line[r]] = {
              name: winningSymbol.name,
              file: winningSymbol.file,
              multiplier: winningSymbol.multiplier
            };
          }
          const recalculated = calculateWinnings(symbolsMatrix, bet, config);

          // Apply dragonEye bonus to forced win too
          let forcedDragonEyeBonus = 0;
          recalculated.finalSymbols.forEach(reelSymbols => {
            reelSymbols.forEach(symbol => {
              if (symbol.name === 'dragonEye') forcedDragonEyeBonus += bet * 0.10;
            });
          });

          totalWin = recalculated.totalWin + forcedDragonEyeBonus;
          finalSymbols = recalculated.finalSymbols;
          isForcedWin = true;
        }
      }
      user.spinsSinceLastSmallWin = 0;
    }

    // --- RNG override ---
    if (!isForcedWin && totalWin > 0 && winRoll > winThreshold) {
      totalWin = 0;
      finalSymbols = symbolsMatrix.map(reel => reel.map(sym => ({ ...sym, win: false })));
      dragonEyeBonus = 0;
      console.log('❌ RNG Override: Win cancelled');
    } else if (totalWin > 0) {
      console.log('✅ Win accepted:', totalWin);
    } else {
      if (winRoll < winThreshold) console.log('🎯 RNG would allow a win, but matrix lost.');
    }

    user.chips += totalWin;

    // Track losing streak & comeback
    if (totalWin > 0) {
      user.losingStreak = 0;
    } else {
      user.losingStreak++;
      if (user.losingStreak >= 30 && user.comebackSpinsLeft === 0) {
        user.comebackSpinsLeft = 3 + Math.floor(Math.random() * 3);
        user.losingStreak = 0;
      }
    }

    const GAME_TYPE_NAMES = {
      ClassicSlot: "Classic Slot",
      PharaohsRiches: "Pharaoh’s Riches Slot",
      DragonBlaze: "Dragon Blaze Slot",
      Lucky777: "Lucky 777 Slot",
      CashCrash: "Cash Crash Slot",
    };

    user.gameHistory.push({
      gameType: GAME_TYPE_NAMES[slotType] || slotType,
      betAmount: bet,
      multiplier: totalWin > 0 ? totalWin / bet : 0,
      winAmount: totalWin,
      dragonEyeBonus,        // send Dragon Eye bonus to frontend
      result: totalWin > 0 ? 'Win' : 'Loss',
      playedAt: new Date()
    });

    await user.save();

    res.json({
      ok: true,
      finalSymbols,
      winnings: totalWin,
      dragonEyeBonus,         // include in response for animation
      balance: user.chips,
      isLuckyDay: config.isLuckyDay,
      losingStreak: user.losingStreak,
      comebackSpinsLeft: user.comebackSpinsLeft,
      spinsSinceLastSmallWin: user.spinsSinceLastSmallWin
    });

  } catch (err) {
    console.error('Spin error', err);
    if (user && bet) {
      user.chips += bet;
      await user.save().catch(e => console.error("Refund failed:", e));
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// --- SIMULATION MODE ---
exports.simulate = async (req, res) => {
  try {
    setSlotType(req);
    const config = getDynamicConfig();

    let balance = 50000; // Starting test balance (BDT)
    const bet = 75; // Default bet per spin
    let spinCount = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalWagered = 0;
    let highestBalance = balance;
    let biggestWin = 0;

    console.log(`🎮 Simulation starting for ${slotType}`);
    console.log(`💰 Starting balance: ${balance} BDT`);

    // Keep running until balance below 10,000
    while (balance >= 10000) {
      spinCount++;
      totalWagered += bet;

      // --- Generate reels
      const symbolsMatrix = Array(config.reels).fill(0).map(() =>
        Array(config.rows).fill(0).map(() => {
          const sym = getRandomSymbol(config);
          return { name: sym.name, file: sym.file, multiplier: sym.multiplier };
        })
      );

      let { totalWin } = calculateWinnings(symbolsMatrix, bet, config);

      // --- Win RNG control
      const minRate = Math.min(config.baseWinRate.MIN, config.baseWinRate.MAX);
      const maxRate = Math.max(config.baseWinRate.MIN, config.baseWinRate.MAX);
      const winThreshold = minRate + Math.random() * ((maxRate - minRate) || 0.0001);
      const winRoll = Math.random();

      // RNG enforcement
      if (totalWin > 0 && winRoll > winThreshold) {
        totalWin = 0; // House advantage
      }

      // Apply result
      balance -= bet;
      balance += totalWin;
      if (totalWin > 0) {
        totalWins++;
        if (totalWin > biggestWin) biggestWin = totalWin;
      } else {
        totalLosses++;
      }

      if (balance > highestBalance) highestBalance = balance;

      // Optional logging every 100 spins
      if (spinCount % 100 === 0) {
        console.log(`🌀 Spins: ${spinCount}, Balance: ${balance.toFixed(2)}, RTP: ${(balance / 50000).toFixed(3)}`);
      }
    }

    const netResult = balance - 50000;
    const rtp = (balance / totalWagered).toFixed(3);

    console.log('--- Simulation Complete ---');
    console.log(`🧾 Spins: ${spinCount}`);
    console.log(`🏆 Total Wins: ${totalWins}`);
    console.log(`💀 Total Losses: ${totalLosses}`);
    console.log(`📈 Highest Balance: ${highestBalance}`);
    console.log(`💸 Biggest Win: ${biggestWin}`);
    console.log(`💰 Final Balance: ${balance}`);
    console.log(`📉 Net Result: ${netResult}`);
    console.log(`🎯 Effective RTP: ${rtp}`);

    res.json({
      ok: true,
      summary: {
        slotType,
        spins: spinCount,
        totalWins,
        totalLosses,
        highestBalance,
        biggestWin,
        finalBalance: balance,
        netResult,
        effectiveRTP: rtp
      }
    });

  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed' });
  }
};
