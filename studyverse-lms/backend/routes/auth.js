const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/auth/login  (students use email OR usn)
router.post('/login', async (req, res) => {
  const { email, usn, password } = req.body;
  const identifier = (email || usn || '').trim().toLowerCase();
  if (!identifier || !password)
    return res.status(400).json({ success: false, message: 'Credentials required.' });
  try {
    const user = await User.findOne({ $or: [{ email: identifier }, { usn: identifier.toUpperCase() }] }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account suspended.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwt();
    res.json({
      success: true, token,
      user: { id: user._id, email: user.email, name: user.name, username: user.username,
               usn: user.usn, role: user.role, semester: user.semester,
               points: user.points, streak: user.streak, firstLogin: user.firstLogin,
               optInLeaderboard: user.optInLeaderboard }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/auth/set-password  (first-login password + username setup)
router.post('/set-password', protect, async (req, res) => {
  const { newPassword, confirmPassword, username } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(newPassword))
    return res.status(400).json({ success: false, message: 'Password must contain letters and numbers.' });
  if (newPassword !== confirmPassword)
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  if (!username || !username.trim())
    return res.status(400).json({ success: false, message: 'Username is required.' });
  try {
    const user = await User.findById(req.user._id);
    user.password          = newPassword;
    user.username          = username.trim();
    user.name              = username.trim();
    user.firstLogin        = false;
    user.passwordUpdatedAt = new Date();
    await user.save();
    res.json({ success: true, message: 'Password and username updated successfully.', user: { id: user._id, email: user.email, name: user.name, username: user.username, usn: user.usn, role: user.role, semester: user.semester, points: user.points, streak: user.streak, firstLogin: user.firstLogin, optInLeaderboard: user.optInLeaderboard } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/auth/register (admin/team creation only — not public)
router.post('/register', protect, async (req, res) => {
  if (!['admin'].includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Only admins can create team accounts.' });
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ success: false, message: 'All fields required.' });
  if (!['admin','team_member'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists.' });
    const user = await User.create({ email, password, name, username: name, role, firstLogin: false });
    res.status(201).json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ success: true, user: req.user }));

// PUT /api/auth/setup
router.put('/setup', protect, async (req, res) => {
  const { username, semester } = req.body;
  if (!username || !semester) return res.status(400).json({ success: false, message: 'Username and semester required.' });
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { username, semester }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/auth/security-question
router.get('/security-question', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, securityQuestion: user.securityQuestion });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;
  if (!email || !securityAnswer || !newPassword)
    return res.status(400).json({ success: false, message: 'All fields required.' });
  try {
    const user = await User.findOne({ email }).select('+securityAnswer');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const match = await user.matchSecurityAnswer(securityAnswer);
    if (!match) return res.status(400).json({ success: false, message: 'Incorrect security answer.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
