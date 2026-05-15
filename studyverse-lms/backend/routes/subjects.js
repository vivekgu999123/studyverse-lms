const express  = require('express');
const router   = express.Router();
const Subject  = require('../models/Subject');
const { protect, authorize } = require('../middleware/auth');
const logAction = require('../middleware/auditLog');

router.get('/', protect, async (req, res) => {
  const { semester } = req.query;
  const filter = semester ? { semester: Number(semester) } : {};
  try {
    const subjects = await Subject.find(filter).sort({ name: 1 });
    res.json({ success: true, subjects });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.json({ success: true, subject });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/seed', async (req, res) => {
  const subjects = [
    { name: 'Algorithm Lab', code: '24ECSP206', semester: 3, icon: 'flask', color: '#6366f1', description: 'Practical implementation of algorithms' },
    { name: 'Database Application Lab', code: '25ECSP204', semester: 3, icon: 'database', color: '#ec4899', description: 'Hands-on database' },
    { name: 'Principles of Compiler Design', code: '25ECSC203', semester: 3, icon: 'gear', color: '#f97316', description: 'Lexical analysis and parsing' },
    { name: 'Database Management System', code: '25ECSC208', semester: 3, icon: 'disc', color: '#06b6d4', description: 'SQL and normalization' },
    { name: 'Design and Analysis of Algorithms', code: '24ECSC205', semester: 3, icon: 'chart', color: '#8b5cf6', description: 'Complexity and graph algorithms' },
    { name: 'Operating Systems Principles', code: '25ECSC209', semester: 3, icon: 'monitor', color: '#10b981', description: 'Processes and scheduling' },
    { name: 'Discrete Mathematics Structures', code: '24EMAB201', semester: 3, icon: 'ruler', color: '#f59e0b', description: 'Sets and logic' },
    { name: 'Computer Networks Lab', code: '25ECSP208', semester: 4, icon: 'globe', color: '#3b82f6', description: 'Network protocols' },
    { name: 'Object Oriented Programming Lab', code: '24ECSP203', semester: 4, icon: 'puzzle', color: '#14b8a6', description: 'OOP in Java' },
    { name: 'Software Engineering', code: '25ECSC213', semester: 4, icon: 'clipboard', color: '#ef4444', description: 'SDLC and design patterns' },
    { name: 'Web Technologies Lab', code: '25ECSP207', semester: 4, icon: 'laptop', color: '#0ea5e9', description: 'HTML CSS JS full stack' },
    { name: 'Machine Learning', code: '25ECSC212', semester: 4, icon: 'robot', color: '#a855f7', description: 'Supervised and unsupervised learning' }
  ];
  try {
    await Subject.deleteMany({});
    const created = await Subject.insertMany(subjects);
    res.json({ success: true, message: created.length + ' subjects seeded.', subjects: created });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, authorize('admin', 'team_member'), async (req, res) => {
  const { name, code, semester, description, icon, color } = req.body;
  if (!name || !code || !semester)
    return res.status(400).json({ success: false, message: 'Name, code and semester required.' });
  try {
    const subject = await Subject.create({ name, code, semester, description, icon, color });
    await logAction({ actionType: 'SUBJECT_CREATED', performedBy: req.user._id, performedByName: req.user.name, targetLabel: name });
    res.status(201).json({ success: true, subject });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, authorize('admin', 'team_member'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    await logAction({ actionType: 'SUBJECT_UPDATED', performedBy: req.user._id, performedByName: req.user.name, targetLabel: subject.name });
    res.json({ success: true, subject });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, authorize('admin', 'team_member'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    await logAction({ actionType: 'SUBJECT_DELETED', performedBy: req.user._id, performedByName: req.user.name, targetLabel: subject.name });
    res.json({ success: true, message: 'Subject deleted.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
