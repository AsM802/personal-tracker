const express = require('express');
const router = express.Router();
const User = require('../models/User');
const HabitData = require('../models/HabitData');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get tracker data for month/year
router.get('/data', async (req, res) => {
  try {
    const month = parseInt(req.query.month) || 0;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let habitData = await HabitData.findOne({ userId: req.userId, month, year });

    res.json({
      habits: habitData ? habitData.habits : [],
      notes: habitData ? habitData.notes : {},
      settings: {
        coins: user.coins || 0,
        darkMode: user.darkMode || false,
        soundEnabled: user.soundEnabled !== false,
        achievements: user.achievements || {}
      },
      rewards: user.rewards || []
    });
  } catch (err) {
    console.error('API /data error:', err);
    res.status(500).json({ error: 'Server error fetching data' });
  }
});

// Save all data for month/year
router.post('/save', async (req, res) => {
  try {
    const { month, year, habits, notes, settings, rewards } = req.body;
    
    if (month !== undefined && year !== undefined) {
      await HabitData.findOneAndUpdate(
        { userId: req.userId, month, year },
        { habits: habits || [], notes: notes || {} },
        { upsert: true, new: true }
      );
    }

    if (settings || rewards) {
      const updateObj = {};
      if (settings) {
        if (settings.coins !== undefined) updateObj.coins = settings.coins;
        if (settings.darkMode !== undefined) updateObj.darkMode = settings.darkMode;
        if (settings.soundEnabled !== undefined) updateObj.soundEnabled = settings.soundEnabled;
        if (settings.achievements !== undefined) updateObj.achievements = settings.achievements;
      }
      if (rewards !== undefined) updateObj.rewards = rewards;

      await User.findByIdAndUpdate(req.userId, updateObj);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('API /save error:', err);
    res.status(500).json({ error: 'Server error saving data' });
  }
});

module.exports = router;
