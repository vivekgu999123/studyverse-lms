const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route GET /api/progress
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const allTasks = await Task.find({ userId: req.user._id }).populate('subject', 'name icon color');

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const pending = total - completed;
    const overallPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    // Per-subject breakdown
    const subjects = await Subject.find({ semester: Number(user.semester) });
    const subjectProgress = subjects.map(sub => {
      const subTasks = allTasks.filter(t => t.subject && t.subject._id.toString() === sub._id.toString());
      const subCompleted = subTasks.filter(t => t.status === 'completed').length;
      return {
        subject: { _id: sub._id, name: sub.name, icon: sub.icon, color: sub.color },
        total: subTasks.length,
        completed: subCompleted,
        percent: subTasks.length === 0 ? 0 : Math.round((subCompleted / subTasks.length) * 100)
      };
    });

    res.json({
      success: true,
      progress: {
        total,
        completed,
        pending,
        overallPercent,
        subjectProgress,
        points: user.points,
        streak: user.streak
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
