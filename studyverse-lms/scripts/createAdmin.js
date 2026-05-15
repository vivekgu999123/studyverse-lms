// ============================================================
// Run this ONCE to create your first admin account
// Usage: node scripts/createAdmin.js
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../backend/models/User');

const ADMIN = {
  name:       'Admin',
  username:   'Admin',
  email:      'admin@studyverse.edu',
  password:   'Admin@123',
  role:       'admin',
  firstLogin: false,
  department: 'CSE',
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const exists = await User.findOne({ email: ADMIN.email });
    if (exists) {
      console.log('⚠️  Admin already exists:', ADMIN.email);
      process.exit(0);
    }
    await User.create(ADMIN);
    console.log('✅ Admin created successfully!');
    console.log('   Email:    ', ADMIN.email);
    console.log('   Password: ', ADMIN.password);
    console.log('   URL:       http://localhost:5000/admin');
    process.exit(0);
  })
  .catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
