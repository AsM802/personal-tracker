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
        motto: user.motto || '"Every dog has a day. This dog\'s day hasn\'t come yet. So this dog works until it does."',
        rules: user.rules || [],
        medals: user.medals || { bronze: 0, silver: 0, gold: 0, honor: 0 },
        darkMode: user.darkMode || false,
        soundEnabled: user.soundEnabled !== false,
        achievements: user.achievements || {}
      },
      rewards: user.rewards || [],
      examScores: user.examScores || [],
      wishlistItems: user.wishlistItems || []
    });
  } catch (err) {
    console.error('API /data error:', err);
    res.status(500).json({ error: 'Server error fetching data' });
  }
});

// Save all data for month/year
router.post('/save', async (req, res) => {
  try {
    const { month, year, habits, notes, settings, rewards, examScores, wishlistItems } = req.body;
    
    if (month !== undefined && year !== undefined) {
      await HabitData.findOneAndUpdate(
        { userId: req.userId, month, year },
        { habits: habits || [], notes: notes || {} },
        { upsert: true, new: true }
      );
    }

    const updateObj = {};
    if (settings) {
      if (settings.coins !== undefined) updateObj.coins = settings.coins;
      if (settings.motto !== undefined) updateObj.motto = settings.motto;
      if (settings.rules !== undefined) updateObj.rules = settings.rules;
      if (settings.medals !== undefined) updateObj.medals = settings.medals;
      if (settings.darkMode !== undefined) updateObj.darkMode = settings.darkMode;
      if (settings.soundEnabled !== undefined) updateObj.soundEnabled = settings.soundEnabled;
      if (settings.achievements !== undefined) updateObj.achievements = settings.achievements;
    }
    if (rewards !== undefined) updateObj.rewards = rewards;
    if (examScores !== undefined) updateObj.examScores = examScores;
    if (wishlistItems !== undefined) updateObj.wishlistItems = wishlistItems;

    if (Object.keys(updateObj).length > 0) {
      await User.findByIdAndUpdate(req.userId, updateObj);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('API /save error:', err);
    res.status(500).json({ error: 'Server error saving data' });
  }
});

// Leaderboard across users
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({}).select('username displayName coins').sort({ coins: -1 }).limit(10);
    res.json({ leaderboard: users });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

module.exports = router;
