const mongoose = require('mongoose');
const User = require('../models/User'); // import User model

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // ---------------------------------------------
    // EXTRA CAREFUL: FIX USERS WITHOUT REFERRAL CODE
    // ---------------------------------------------
    console.log('🔎 Checking for users missing referral codes...');

    const usersWithoutCode = await User.find({ referralCode: { $exists: false } }).select('_id');

    if (usersWithoutCode.length > 0) {
      console.log(`⚠️ Found ${usersWithoutCode.length} users without referral codes. Assigning...`);

      const bulkOps = usersWithoutCode.map(user => ({
        updateOne: {
          filter: { _id: user._id },
          update: {
            referralCode: Math.floor(1000000 + Math.random() * 9000000).toString()
          }
        }
      }));

      await User.bulkWrite(bulkOps);

      console.log('✅ Missing referral codes assigned successfully.');
    } else {
      console.log('✅ All users already have referral codes.');
    }

  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
