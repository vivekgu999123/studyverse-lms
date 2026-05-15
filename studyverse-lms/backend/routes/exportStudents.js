const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/export/students
router.get('/students', protect, authorize('admin', 'team_member'), async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-password -securityAnswer').lean();

    const header = ['Name', 'USN', 'Email', 'Department', 'Semester', 'Role', 'Status', 'RegistrationDate', 'LastLogin'];
    const rows = users.map(u => [
      u.name || '',
      u.usn  || '',
      u.email || '',
      u.department || '',
      u.semester || '',
      u.role || '',
      u.status || '',
      u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
      u.lastLogin ? new Date(u.lastLogin).toISOString().split('T')[0] : 'Never'
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="students_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
