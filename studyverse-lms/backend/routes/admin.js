const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Subject  = require('../models/Subject');
const Resource = require('../models/Resource');
const Task     = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

const adminOrTeam = [protect, authorize('admin', 'team_member')];

// GET /api/admin/overview
router.get('/overview', ...adminOrTeam, async (req, res) => {
  try {
    const [totalStudents, totalResources, totalSubjects, totalTasks, completedTasks, activeUsers, recentStudents, recentResources, recentTasks, recentLogs] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Resource.countDocuments(),
      Subject.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5).select('name email usn createdAt'),
      Resource.find().sort({ createdAt: -1 }).limit(5).populate('subject', 'name').select('title type createdAt'),
      Task.find({ status: 'completed' }).sort({ completedAt: -1 }).limit(5).populate('userId', 'name email').select('title status completedAt'),
      AuditLog.find().sort({ createdAt: -1 }).limit(10)
    ]);

    res.json({
      success: true,
      stats: { totalStudents, totalResources, totalSubjects, totalTasks, completedTasks, pendingTasks: totalTasks - completedTasks, activeUsers },
      recentStudents, recentResources, recentTasks, recentLogs
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/analytics
router.get('/analytics', ...adminOrTeam, async (req, res) => {
  try {
    // Tasks per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
    const taskActivity = await Task.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Resources per subject
    const resourcesBySubject = await Resource.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subjectInfo' } },
      { $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$subjectInfo.name', 'Unlinked'] }, count: 1 } },
      { $sort: { count: -1 } }, { $limit: 10 }
    ]);

    // Task completion rate per semester
    const taskBySemester = await Task.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $group: { _id: { semester: '$user.semester', status: '$status' }, count: { $sum: 1 } } }
    ]);

    // Logins per day (last 7 days)
    const loginActivity = await User.aggregate([
      { $match: { lastLogin: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({ success: true, taskActivity, resourcesBySubject, taskBySemester, loginActivity });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
