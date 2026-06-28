require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const HabitData = require('./models/HabitData');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://app1:Tv8ut0MUHwP52bJY@cluster0.5zp4y4m.mongodb.net/habitflow?retryWrites=true&w=majority';

const asmHabits = [
  { name: '🌅 Wake up at 7:00 AM', goal: 25, difficulty: 'easy' },
  { name: '✨ Skincare + Freshen up (7:05-7:20)', goal: 25, difficulty: 'easy' },
  { name: '📰 Newspaper + Current Affairs (7:20-8:00)', goal: 25, difficulty: 'medium' },
  { name: '📚 SSC Class / Mock Test', goal: 22, difficulty: 'hard' },
  { name: '🏊 Gym / Swimming (5:00-7:00 PM)', goal: 20, difficulty: 'hard' },
  { name: '📝 SSC Questions / Revision', goal: 22, difficulty: 'medium' },
  { name: '💻 Cybersecurity Learning', goal: 20, difficulty: 'medium' },
  { name: '💧 Drink 3L Water', goal: 28, difficulty: 'easy' },
  { name: '🧘‍♂️ Meditate for 15 minutes', goal: 25, difficulty: 'medium' },
  { name: '😴 Sleep by 10:00 PM', goal: 22, difficulty: 'medium' }
];

const asmRewards = [
  { id: 'nyx_1', name: '🔥 FuelX Pro / BoosterPlug', emoji: '⚙️', cost: 150, requiredMedals: { bronze: 5, silver: 3, gold: 2, honor: 0 }, redeemed: false },
  { id: 'nyx_2', name: '🔥 66BHP Teflon Brake Hose', emoji: '🏍️', cost: 100, requiredMedals: { bronze: 3, silver: 2, gold: 0, honor: 0 }, redeemed: false },
  { id: 'nyx_3', name: '💧 Liqui Moly DOT 5.1', emoji: '🧪', cost: 60, requiredMedals: { bronze: 2, silver: 0, gold: 0, honor: 0 }, redeemed: false },
  { id: 'nyx_4', name: '🖤 Single Seat + Cowl', emoji: '🏍️', cost: 120, requiredMedals: { bronze: 3, silver: 2, gold: 1, honor: 0 }, redeemed: false },
  { id: 'nyx_5', name: '🎨 Wine Red Paint / Wrap', emoji: '🎨', cost: 200, requiredMedals: { bronze: 0, silver: 0, gold: 2, honor: 1 }, redeemed: false },
  { id: 'nyx_6', name: '🛑 Venta Floating Rotor', emoji: '🛑', cost: 140, requiredMedals: { bronze: 0, silver: 3, gold: 1, honor: 0 }, redeemed: false },
  { id: 'nyx_7', name: '⚙️ RCB Brake & Clutch Levers', emoji: '🔧', cost: 110, requiredMedals: { bronze: 4, silver: 2, gold: 0, honor: 0 }, redeemed: false },
  { id: 'nyx_8', name: '🔊 Powerage Exhaust', emoji: '🔊', cost: 250, requiredMedals: { bronze: 4, silver: 4, gold: 3, honor: 1 }, redeemed: false },
  { id: 'nyx_9', name: '⛰️ Ponmudi Ride / Kerala Weekend Ride', emoji: '🌄', cost: 180, requiredMedals: { bronze: 3, silver: 3, gold: 2, honor: 0 }, redeemed: false }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    let user = await User.findOne({ email: 'agnives46@gmail.com' });
    const hash = await bcrypt.hash('AsM123456', 10);

    const asmMedals = { bronze: 3, silver: 2, gold: 1, honor: 0 };

    const asmMotto = `"Every dog has a day. This dog's day hasn't come yet. So this dog works until it does."`;
    const asmRules = [
      '📚 No bike mods unless you study',
      '💰 Save before spending',
      '🏍️ Nyx gets rewarded when ASM stays consistent',
      '😴 Sleep enough to recover',
      '🍌 Hostel Food Supplement (bananas, eggs, milk, peanuts, oats)'
    ];

    if (!user) {
      user = new User({
        username: 'AsM',
        email: 'agnives46@gmail.com',
        displayName: 'AsM',
        passwordHash: hash,
        rewards: asmRewards,
        medals: asmMedals,
        motto: asmMotto,
        rules: asmRules,
        coins: 100
      });
      await user.save();
      console.log('Created new user for AsM (agnives46@gmail.com)');
    } else {
      user.rewards = asmRewards;
      user.medals = asmMedals;
      user.motto = asmMotto;
      user.rules = asmRules;
      user.coins = 100;
      await user.save();
      console.log('Updated existing user for AsM');
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let habitData = await HabitData.findOne({ userId: user._id, month: currentMonth, year: currentYear });
    const formattedHabits = asmHabits.map((h, idx) => ({
      id: 'asm_h_' + idx,
      name: h.name,
      goal: h.goal,
      difficulty: h.difficulty,
      checks: (habitData && habitData.habits && habitData.habits[idx]) ? habitData.habits[idx].checks : {}
    }));

    if (!habitData) {
      habitData = new HabitData({
        userId: user._id,
        month: currentMonth,
        year: currentYear,
        habits: formattedHabits
      });
    } else {
      habitData.habits = formattedHabits;
    }
    await habitData.save();
    console.log('Pre-loaded AsM daily routine habits');

    console.log('✅ AsM profile successfully seeded with full schedule, 3L water, meditation & Nyx roadmap!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
