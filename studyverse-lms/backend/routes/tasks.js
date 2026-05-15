const express = require('express');
const router  = express.Router();
const Task    = require('../models/Task');
const User    = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// GET /api/tasks  — students get own tasks, admin/team get all
router.get('/', protect, async (req, res) => {
  const { status, subjectId, today, limit = 50 } = req.query;
  const isAdmin = ['admin','team_member'].includes(req.user.role);
  const filter  = isAdmin ? {} : { userId: req.user._id };

  if (status)    filter.status     = status;
  if (subjectId) filter.subject    = subjectId;
  if (today === 'true') {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    filter.dueDate = { $gte: start, $lte: end };
  }

  try {
    const tasks = await Task.find(filter)
      .populate('subject', 'name icon color')
      .populate('userId', 'name email usn')
      .sort({ dueDate: 1, priority: -1 })
      .limit(Number(limit));
    res.json({ success: true, tasks });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/tasks
router.post('/', protect, async (req, res) => {
  const { title, description, subjectId, priority, dueDate } = req.body;
  if (!title || !dueDate)
    return res.status(400).json({ success: false, message: 'Title and due date are required.' });
  try {
    const task = await Task.create({
      userId: req.user._id,
      title, description,
      subject: subjectId || null,
      priority: priority || 'medium',
      dueDate
    });
    const populated = await task.populate('subject', 'name icon color');
    res.status(201).json({ success: true, task: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/tasks/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const isAdmin = ['admin','team_member'].includes(req.user.role);
    if (!isAdmin && task.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const wasCompleted = task.status === 'completed';
    const nowCompleted = req.body.status === 'completed';
    Object.assign(task, req.body);
    if (nowCompleted && !wasCompleted) task.completedAt = new Date();
    await task.save();

    if (nowCompleted && !wasCompleted) {
      const user = await User.findById(task.userId);
      if (user) {
        user.points += 10;
        const today    = new Date(); today.setHours(0,0,0,0);
        const lastDate = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        if (lastDate) lastDate.setHours(0,0,0,0);
        if (!lastDate) { user.streak = 1; }
        else {
          const diff = Math.round((today - lastDate) / 864e5);
          if (diff === 0) {}
          else if (diff === 1) { user.streak += 1; }
          else { user.streak = 1; }
        }
        user.lastActiveDate = new Date();
        await user.save();
      }
    }

    const populated = await task.populate('subject', 'name icon color');
    res.json({ success: true, task: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    const isAdmin = ['admin','team_member'].includes(req.user.role);
    if (!isAdmin && task.userId.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
