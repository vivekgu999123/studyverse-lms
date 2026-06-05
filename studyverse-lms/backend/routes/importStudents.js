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

    const usn        = (row.USN  || row.usn  || '').trim().toUpperCase();
    const email      = (row.Email || row.email || '').trim().toLowerCase() || (usn ? usn.toLowerCase() + '@studyverse.edu' : '');
    const password   = (row.Password || row.password || 'Welcome@123').trim();
    const department = 'CSE';
    const semester   = parseInt(row.Semester || row.semester || '3');
    const name       = (row.Name || row.name || '').trim();

    if (!usn || !email) {
      results.failed.push({ row: rowNum, reason: 'Missing USN (required)', data: row });
      continue;
    }
    if (![3, 4].includes(semester)) {
      results.failed.push({ row: rowNum, reason: 'Invalid semester (only 3 or 4 allowed)', data: row });
      continue;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      results.failed.push({ row: rowNum, reason: 'Invalid email', data: row });
      continue;
    }

    try {
      // USN is the primary key — check for duplicate USN first
      const existsByUsn = await User.findOne({ usn });
      if (existsByUsn) {
        results.duplicates++;
        results.rows.push({ row: rowNum, status: 'duplicate', email, usn });
        continue;
      }
      // Also check email to avoid duplicate email errors
      const existsByEmail = await User.findOne({ email });
      if (existsByEmail) {
        results.duplicates++;
        results.rows.push({ row: rowNum, status: 'duplicate', email, usn });
        continue;
      }
      await User.create({
        name: name || '', username: name || '', usn, email, password,
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
