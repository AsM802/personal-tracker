require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// Connect MongoDB with caching for serverless environments
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/habitflow';
let isConnected = false;

async function connectDB() {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }
  await mongoose.connect(MONGODB_URI);
  isConnected = true;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in middleware:', err);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Fallback to static html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
}

module.exports = app;
