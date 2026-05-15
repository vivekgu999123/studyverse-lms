const express  = require('express');
const router   = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

// GET /api/audit
router.get('/', protect, authorize('admin'), async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  try {
    const total = await AuditLog.countDocuments();
    const logs  = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('performedBy', 'name email role');
    res.json({ success: true, logs, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
