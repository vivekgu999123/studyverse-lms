const express  = require('express');
const router   = express.Router();
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/auditLog');

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

// POST /api/resources
router.post('/', protect, async (req, res) => {
  const { title, url, description, subjectId, resourceType } = req.body;
  if (!title || !url || !subjectId)
    return res.status(400).json({ success: false, message: 'Title, URL and subjectId are required.' });
  try {
    const isAdminOrTeam = ['admin','team_member'].includes(req.user.role);
    const resource = await Resource.create({
      title, url, description,
      subject: subjectId,
      resourceType: resourceType || 'link',
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
