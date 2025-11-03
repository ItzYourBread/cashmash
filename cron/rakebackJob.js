// cron/rakebackCron.js
const cron = require('node-cron');
const User = require('../models/User');

// ✅ Helper to get week range
function getWeekRange() {
  const now = new Date();
  const end = new Date(now.setHours(0, 0, 0, 0)); // Friday midnight
  const start = new Date(end);
  start.setDate(end.getDate() - 7);
  return { start, end };
}

// ✅ Cron: every Friday at 00:00
cron.schedule('0 0 * * 5', async () => {
  console.log('🕛 Weekly rakeback cron started:', new Date().toLocaleString());

  try {
    const users = await User.find({ totalWagered: { $gt: 0 } });

    const { start, end } = getWeekRange();
    let totalRakeback = 0;

    for (const user of users) {
      const rakebackAmount = (user.totalWagered * user.rakebackPercent) / 100;

      if (rakebackAmount > 0) {
        await user.addRakeback(rakebackAmount, start, end);
        totalRakeback += rakebackAmount;

        console.log(`💰 Credited ${rakebackAmount.toFixed(2)} chips to ${user.username}`);
      }
    }

    console.log(`✅ Rakeback completed. Total distributed: ${totalRakeback.toFixed(2)} chips`);
  } catch (err) {
    console.error('❌ Rakeback cron error:', err);
  }
});
