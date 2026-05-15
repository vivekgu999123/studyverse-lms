const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { parse } = require('csv-parse/sync');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/auditLog');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/import/students
router.post('/students', protect, authorize('admin', 'team_member'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'CSV file required.' });

  let records;
  try {
    records = parse(req.file.buffer.toString(), {
      columns: true, skip_empty_lines: true, trim: true
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid CSV format: ' + err.message });
  }

  const results = { total: records.length, imported: 0, duplicates: 0, failed: [], rows: [] };

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // 1-indexed + header

    const name       = (row.Name || row.name || '').trim();
    const usn        = (row.USN  || row.usn  || '').trim().toUpperCase();
    const email      = (row.Email || row.email || '').trim().toLowerCase();
    const password   = (row.Password || row.password || '').trim();
    const department = (row.Department || row.department || 'CSE').trim();
    const semester   = parseInt(row.Semester || row.semester || '3');

    if (!name || !usn || !email || !password) {
      results.failed.push({ row: rowNum, reason: 'Missing required fields', data: row });
      continue;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      results.failed.push({ row: rowNum, reason: 'Invalid email', data: row });
      continue;
    }

    try {
      const exists = await User.findOne({ $or: [{ email }, { usn }] });
      if (exists) {
        results.duplicates++;
        results.rows.push({ row: rowNum, status: 'duplicate', email, usn });
        continue;
      }
      await User.create({
        name, username: name, usn, email, password,
        department, semester: isNaN(semester) ? 3 : semester,
        role: 'student', firstLogin: true
      });
      results.imported++;
      results.rows.push({ row: rowNum, status: 'imported', email, usn });
    } catch (err) {
      results.failed.push({ row: rowNum, reason: err.message, data: row });
    }
  }

  await logAction({
    actionType: 'CSV_IMPORT',
    performedBy: req.user._id,
    performedByName: req.user.name,
    details: `Imported ${results.imported}/${results.total} students. Duplicates: ${results.duplicates}. Failed: ${results.failed.length}`
  });

  res.json({ success: true, results });
});

module.exports = router;
