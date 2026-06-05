require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Remove empty USN values
    const result = await User.updateMany(
      { usn: '' },
      { $unset: { usn: 1 } }
    );

    console.log(`✅ Cleaned empty USN values from ${result.modifiedCount} document(s).`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
