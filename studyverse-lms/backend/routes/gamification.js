const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route GET /api/gamification/leaderboard
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const leaders = await User.find({ optInLeaderboard: true, username: { $nin: ['', null] } })
      .select('username points streak')
      .sort({ points: -1 })
      .limit(5);

    res.json({ success: true, leaderboard: leaders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/gamification/optin
router.put('/optin', protect, async (req, res) => {
  const { optIn } = req.body;
  try {
    await User.findByIdAndUpdate(req.user._id, { optInLeaderboard: optIn });
    res.json({ success: true, message: `Leaderboard opt-${optIn ? 'in' : 'out'} successful.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
