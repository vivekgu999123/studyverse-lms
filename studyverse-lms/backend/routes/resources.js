const express  = require('express');
const router   = express.Router();
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/auditLog');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// Configure upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/resources');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// GET /api/resources?subjectId=xxx
router.get('/', protect, async (req, res) => {
  const { subjectId } = req.query;
  if (!subjectId) return res.status(400).json({ success: false, message: 'subjectId required.' });
  try {
    const resources = await Resource.find({
      subject: subjectId,
      $or: [{ type: 'system' }, { type: 'personal', userId: req.user._id }]
    }).sort({ type: 1, createdAt: -1 });
    res.json({ success: true, resources });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/resources/all  (admin/team)
router.get('/all', protect, authorize('admin', 'team_member'), async (req, res) => {
  const { subjectId, page = 1, limit = 30 } = req.query;
  const filter = subjectId ? { subject: subjectId } : {};
  try {
    const total = await Resource.countDocuments(filter);
    const resources = await Resource.find(filter)
      .populate('userId', 'name email usn')
      .populate('subject', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, resources, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/resources (Accepts optional file upload)
router.post('/', protect, upload.single('file'), async (req, res) => {
  const { title, url, description, subjectId, resourceType } = req.body;
  if (!title || !subjectId)
    return res.status(400).json({ success: false, message: 'Title and subjectId are required.' });
  if (!url && !req.file)
    return res.status(400).json({ success: false, message: 'Either a URL or an uploaded file is required.' });

  try {
    const finalUrl = req.file ? `/uploads/resources/${req.file.filename}` : url;
    const isAdminOrTeam = ['admin','team_member'].includes(req.user.role);
    const resource = await Resource.create({
      title,
      url: finalUrl,
      description: description || '',
      subject: subjectId,
      resourceType: resourceType || 'notes',
      type: isAdminOrTeam ? 'system' : 'personal',
      userId: req.user._id
    });
    res.status(201).json({ success: true, resource });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/resources/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found.' });
    const isAdminOrTeam = ['admin','team_member'].includes(req.user.role);
    if (!isAdminOrTeam && resource.userId?.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await resource.deleteOne();
    await logAction({ actionType: 'RESOURCE_DELETED', performedBy: req.user._id, performedByName: req.user.name, targetId: resource._id, targetLabel: resource.title });
    res.json({ success: true, message: 'Resource deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
