// cron/rakebackCron.js
const cron = require('node-cron');
const User = require('../models/User');

// ✅ Helper: Get week range
function getWeekRange() {
  const now = new Date();
  const end = new Date(now.setHours(0, 0, 0, 0));
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  return { start, end };
}

// ✅ TEST VERSION: Runs every minute
cron.schedule('* * * * *', async () => {
  console.log('🕛 [TEST] Rakeback cron started:', new Date().toLocaleString());

  try {
    const users = await User.find({ totalWagered: { $gt: 0 } });
    const { start, end } = getWeekRange();

    let totalRakeback = 0;
    let userCount = 0;

    for (const user of users) {
      const rakebackAmount = (user.totalWagered * user.rakebackPercent) / 100;

      if (rakebackAmount > 0) {
        user.chips += rakebackAmount;

        if (!Array.isArray(user.rakebackHistory)) user.rakebackHistory = [];

        const historyEntry = {
          amount: rakebackAmount,
          weekStart: start,
          weekEnd: end,
          wagered: user.totalWagered,
          createdAt: new Date(),
        };

        user.rakebackHistory.push(historyEntry);
        user.totalWagered = 0;

        await user.save();

        totalRakeback += rakebackAmount;
        userCount++;

        console.log(
          `💰 [RAKEBACK] ${user.username} got ${rakebackAmount.toFixed(2)} Balance | Wagered: ${historyEntry.wagered.toFixed(
            2
          )} | Balance: ${user.chips.toFixed(2)}`
        );
      }
    }

    if (userCount > 0) {
      console.log(`✅ [TEST] Distributed ${totalRakeback.toFixed(2)} Balance to ${userCount} users.`);
    } else {
      console.log('ℹ️ [TEST] No eligible users this minute.');
    }
  } catch (err) {
    console.error('❌ [TEST] Rakeback cron error:', err);
  }
});
