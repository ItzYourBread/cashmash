// cron/rakebackCron.js
const cron = require('node-cron');
const User = require('../models/User');

// 🧮 Helper: Get date 30 days ago
function get30DayRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end };
}

// 🗓 Helper: Get current week range
function getWeekRange() {
    const now = new Date();
    const end = new Date(now.setHours(0, 0, 0, 0));
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return { start, end };
}

// 🧾 Helper: Determine rakeback level by 30-day wagered total
function getRakebackLevel(totalWagered) {
    if (totalWagered < 40000) return { level: 1, percent: 5 };
    if (totalWagered < 100000) return { level: 2, percent: 8 };
    if (totalWagered < 150000) return { level: 3, percent: 12 };
    if (totalWagered < 200000) return { level: 4, percent: 15 };
    if (totalWagered < 250000) return { level: 5, percent: 18 };
    return { level: 5, percent: 18 };
}

// 🕛 Runs every minute for testing (change back to weekly later)
cron.schedule('0 0 * * 5', async () => {
    console.log('🕛 [WEEKLY] Rakeback Cron Started:', new Date().toLocaleString());

    try {
        const users = await User.find({ totalWagered: { $gt: 0 } });
        const { start: weekStart, end: weekEnd } = getWeekRange();
        const { start: monthStart, end: monthEnd } = get30DayRange();

        let totalRakeback = 0;
        let userCount = 0;

        for (const user of users) {
            // --- Calculate 30-day total wagered from history
            const last30Days = (user.rakebackHistory || []).filter(entry => {
                const entryDate = entry.createdAt || entry.creditedAt;
                if (!entryDate) return false;
                const d = new Date(entryDate);
                return d >= monthStart && d <= monthEnd;
            });

            const total30DayWagered = last30Days.reduce((sum, e) => sum + (e.wagered || 0), 0) + (user.totalWagered || 0);

            // --- Determine level and percentage
            const { level, percent } = getRakebackLevel(total30DayWagered);
            user.rakebackPercent = percent;

            // --- Calculate this week’s rakeback
            const rakebackAmount = (user.totalWagered * percent) / 100;

            if (rakebackAmount > 0) {
                user.balance += rakebackAmount;

                // --- Add rakeback history
                if (!Array.isArray(user.rakebackHistory)) user.rakebackHistory = [];

                user.rakebackHistory.push({
                    amount: rakebackAmount,
                    wagered: user.totalWagered,
                    weekStart,
                    weekEnd,
                    percent,
                    createdAt: new Date(),
                });

                console.log(
                    `💰 [RAKEBACK] ${user.username} → Level ${level} (${percent}%) | Weekly Wagered: ${user.totalWagered.toFixed(
                        2
                    )} | Rakeback: ${rakebackAmount.toFixed(2)}`
                );

                totalRakeback += rakebackAmount;
                userCount++;

                // --- Reset for next week
                user.totalWagered = 0;

                await user.save();
            }
        }

        if (userCount > 0) {
            console.log(`✅ [WEEKLY] Distributed ${totalRakeback.toFixed(2)} balance to ${userCount} users.`);
        } else {
            console.log('ℹ️ [WEEKLY] No eligible users this week.');
        }
    } catch (err) {
        console.error('❌ [WEEKLY] Rakeback Cron Error:', err);
    }

});
