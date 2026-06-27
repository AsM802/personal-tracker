require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const HabitData = require('./models/HabitData');

const MONGODB_URI = process.env.MONGODB_URI;

const asmHabits = [
  { name: '🌅 Wake up at 7:00 AM', goal: 25, difficulty: 'easy' },
  { name: '✨ Skincare + Freshen up (7:05-7:20)', goal: 25, difficulty: 'easy' },
  { name: '📰 Newspaper + Current Affairs (7:20-8:00)', goal: 25, difficulty: 'medium' },
  { name: '📚 SSC Class / Mock Test', goal: 22, difficulty: 'hard' },
  { name: '🏊 Gym / Swimming (5:00-7:00 PM)', goal: 20, difficulty: 'hard' },
  { name: '📝 SSC Questions / Revision', goal: 22, difficulty: 'medium' },
  { name: '💻 Cybersecurity Learning (9:30-10:00 PM)', goal: 20, difficulty: 'medium' },
  { name: '😴 Sleep by 10:00 PM', goal: 22, difficulty: 'medium' }
];

const asmRewards = [
  { id: 'nyx_1', name: '🔥 FuelX Pro / BoosterPlug', emoji: '⚙️', cost: 150, redeemed: false },
  { id: 'nyx_2', name: '🔥 66BHP Teflon Brake Hose', emoji: '🏍️', cost: 100, redeemed: false },
  { id: 'nyx_3', name: '💧 Liqui Moly DOT 5.1', emoji: '🧪', cost: 60, redeemed: false },
  { id: 'nyx_4', name: '🖤 Single Seat + Cowl', emoji: '🏍️', cost: 120, redeemed: false },
  { id: 'nyx_5', name: '🎨 Wine Red Paint / Wrap', emoji: '🎨', cost: 200, redeemed: false },
  { id: 'nyx_6', name: '🛑 Venta Floating Rotor', emoji: '🛑', cost: 140, redeemed: false },
  { id: 'nyx_7', name: '⚙️ RCB Brake & Clutch Levers', emoji: '🔧', cost: 110, redeemed: false },
  { id: 'nyx_8', name: '🔊 Powerage Exhaust', emoji: '🔊', cost: 250, redeemed: false },
  { id: 'nyx_9', name: '⛰️ Ponmudi Ride / Kerala Weekend Ride', emoji: '🌄', cost: 180, redeemed: false }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    let user = await User.findOne({ email: 'agnives46@gmail.com' });
    const hash = await bcrypt.hash('AsM123456', 10);

    if (!user) {
      user = new User({
        username: 'AsM',
        email: 'agnives46@gmail.com',
        displayName: 'AsM',
        passwordHash: hash,
        rewards: asmRewards,
        coins: 50
      });
      await user.save();
      console.log('Created new user for AsM (agnives46@gmail.com)');
    } else {
      user.rewards = asmRewards;
      await user.save();
      console.log('Updated existing user for AsM');
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let habitData = await HabitData.findOne({ userId: user._id, month: currentMonth, year: currentYear });
    if (!habitData) {
      const formattedHabits = asmHabits.map((h, idx) => ({
        id: 'asm_h_' + idx,
        name: h.name,
        goal: h.goal,
        difficulty: h.difficulty,
        checks: {}
      }));
      habitData = new HabitData({
        userId: user._id,
        month: currentMonth,
        year: currentYear,
        habits: formattedHabits
      });
      await habitData.save();
      console.log('Pre-loaded AsM daily routine habits');
    }

    console.log('✅ AsM profile successfully configured!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
