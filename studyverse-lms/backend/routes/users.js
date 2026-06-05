const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Task     = require('../models/Task');
const Resource = require('../models/Resource');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/auditLog');

const adminOrTeam = [protect, authorize('admin', 'team_member')];
const adminOnly   = [protect, authorize('admin')];

// GET /api/users  — list all users (admin/team)
router.get('/', ...adminOrTeam, async (req, res) => {
  const { role, semester, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role)     filter.role = role;
  if (semester) filter.semester = Number(semester);
  if (search)   filter.$or = [
    { name: new RegExp(search, 'i') },
    { email: new RegExp(search, 'i') },
    { usn: new RegExp(search, 'i') }
  ];
  try {
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -securityAnswer')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/users/:id  — single user detail with stats
router.get('/:id', ...adminOrTeam, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -securityAnswer');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const [taskCount, completedTasks, resourceCount] = await Promise.all([
      Task.countDocuments({ userId: user._id }),
      Task.countDocuments({ userId: user._id, status: 'completed' }),
      Resource.countDocuments({ userId: user._id })
    ]);
    res.json({ success: true, user, stats: { taskCount, completedTasks, pendingTasks: taskCount - completedTasks, resourceCount } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/users/:id  — update status / semester / role
router.patch('/:id', ...adminOnly, async (req, res) => {
  const allowed = ['status', 'semester', 'role', 'name', 'username'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.semester !== undefined && ![3, 4].includes(Number(updates.semester))) {
    return res.status(400).json({ success: false, message: 'Only semester 3 and 4 are supported.' });
  }
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target.role === 'admin' && req.user._id.toString() !== target._id.toString())
      return res.status(403).json({ success: false, message: 'Cannot modify another admin.' });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    await logAction({ actionType: 'USER_UPDATED', performedBy: req.user._id, performedByName: req.user.name, targetId: user._id, targetLabel: user.email, details: JSON.stringify(updates) });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', ...adminOnly, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
    if (target.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    await User.findByIdAndDelete(req.params.id);
    await logAction({ actionType: 'USER_DELETED', performedBy: req.user._id, performedByName: req.user.name, targetId: req.params.id, targetLabel: target.email });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/users/:id/reset-password  — admin resets a student's password
router.post('/:id/reset-password', ...adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 chars.' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.password          = newPassword;
    user.firstLogin        = true;
    user.passwordUpdatedAt = null;
    await user.save();
    await logAction({ actionType: 'PASSWORD_RESET', performedBy: req.user._id, performedByName: req.user.name, targetId: user._id, targetLabel: user.email });
    res.json({ success: true, message: 'Password reset. Student must change on next login.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
