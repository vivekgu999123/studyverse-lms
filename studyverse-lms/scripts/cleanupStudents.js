/**
 * Cleanup script: Delete ALL student accounts from the database.
 * Admin and team_member accounts are preserved.
 *
 * Usage: node scripts/cleanupStudents.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../backend/models/User');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Error: MONGO_URI environment variable not found in .env file.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB.');

    // Count students before deletion
    const studentCount = await User.countDocuments({ role: 'student' });
    console.log(`Found ${studentCount} students in database.`);

    if (studentCount === 0) {
      console.log('No student records to clean up.');
    } else {
      console.log('Deleting student records...');
      const result = await User.deleteMany({ role: 'student' });
      console.log(`✅ Successfully deleted ${result.deletedCount} student records.`);
    }

    // List remaining users for sanity check
    const totalUsers = await User.countDocuments({});
    const adminCount = await User.countDocuments({ role: 'admin' });
    const teamCount = await User.countDocuments({ role: 'team_member' });
    console.log(`Remaining users in DB: ${totalUsers} (Admins: ${adminCount}, Team Members: ${teamCount})`);

  } catch (err) {
    console.error('❌ Database error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
