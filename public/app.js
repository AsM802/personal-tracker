/*  ============================================================
 *  DIGITAL HABIT TRACKER — app.js
 *  ============================================================
 *  Sections:
 *    1.  Constants & Default Data
 *    2.  State Management (load / save / localStorage)
 *    3.  Utility Functions
 *    4.  Initialization
 *    5.  Selectors / Dropdowns
 *    6.  Grid Building
 *    7.  Cell Interaction (toggle, coins)
 *    8.  Chart – Daily Progress Bar Chart
 *    9.  Chart – Overall Progress Ring
 *   10.  Chart – Overview Donut
 *   11.  Chart – Weekly Area Chart
 *   12.  Week Tabs
 *   13.  Progress Table
 *   14.  Top 10 Habits
 *   15.  Daily / Weekly Stats
 *   16.  Streaks
 *   17.  Achievements
 *   18.  Confetti
 *   19.  Reward Shop
 *   20.  Theme Toggle
 *   21.  Sound Effects (Web Audio API)
 *   22.  Heatmap
 *   23.  Notes Modal
 *   24.  Export
 *   25.  Predictive Analytics
 *   26.  Modal Helpers
 *   27.  Event Listeners
 *  ============================================================ */

/* ─────────────────────────────────────────────
   1. CONSTANTS & DEFAULT DATA
   ───────────────────────────────────────────── */

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const DAY_LETTERS = ['M','T','W','T','F','S','S'];

const DIFFICULTY_COINS = { easy: 1, medium: 2, hard: 3 };

const DEFAULT_HABITS = [
  { name: 'Wake up at 6 am',                   goal: 25, difficulty: 'easy'   },
  { name: 'Make bed',                           goal: 25, difficulty: 'easy'   },
  { name: 'Complete morning skin care routine', goal: 25, difficulty: 'medium' },
  { name: 'Meditate',                           goal: 20, difficulty: 'medium' },
  { name: 'Read',                               goal: 25, difficulty: 'easy'   },
  { name: 'Go to the gym',                      goal: 20, difficulty: 'hard'   },
  { name: 'Take a break',                       goal: 25, difficulty: 'easy'   },
  { name: 'Eat healthy food',                   goal: 25, difficulty: 'medium' },
  { name: 'Drink 2L of water',                  goal: 25, difficulty: 'easy'   },
  { name: 'Get 8 hours of sleep',               goal: 25, difficulty: 'easy'   },
];

const ACHIEVEMENT_DEFS = {
  '7day_warrior':  { label: '7-Day Warrior',  emoji: '⚔️',  desc: '7+ day streak on any habit' },
  'perfect_week':  { label: 'Perfect Week',   emoji: '🌟',  desc: 'All habits checked for 7 consecutive days' },
  'perfect_month': { label: 'Perfect Month',  emoji: '👑',  desc: '100 % completion for the month' },
  'iron_will':     { label: 'Iron Will',      emoji: '🏋️', desc: '30-day streak on a hard habit' },
  'early_bird':    { label: 'The Early Bird', emoji: '🌅',  desc: 'Wake up / morning habit done for 15+ days' },
  'the_machine':   { label: 'The Machine',    emoji: '🤖',  desc: 'Complete 100+ total habits' },
  'the_comeback':  { label: 'The Comeback',   emoji: '🔥',  desc: 'Maintain a 10-day streak after missing entries' },
  'shopaholic':    { label: 'Shopaholic',      emoji: '🛒',  desc: '5+ rewards redeemed' },
};

const ACCENT   = '#6c63ff';
const ACCENT2  = '#ff6584';
const GREEN    = '#27ae60';
const GRAY_BG  = '#e0e0e0';
const DARK_BG  = '#1e1e2f';

/* ─────────────────────────────────────────────
   2. STATE MANAGEMENT (Server API)
   ───────────────────────────────────────────── */

let STATE = {
  currentMonth: new Date().getMonth(),
  currentYear:  new Date().getFullYear(),
  darkMode:     false,
  soundEnabled: true,
  coins:        0,
  medals:       { bronze: 0, silver: 0, gold: 0, honor: 0 },
  activeWeekTab: 0,
};

let habits       = [];
let notes        = {};
let rewards      = [];
let achievements = {};
let examScores   = [];
let wishlistItems= [];
let currentUser  = null;

async function apiGet(url) {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  return res.json();
}

function habitsKey(m, y) { return `habits_${y}_${m}`; }
function notesKey(m, y)  { return `notes_${y}_${m}`; }

async function checkAuth() {
  try {
    const data = await apiGet('/auth/me');
    if (data.user) {
      currentUser = data.user;
      return true;
    }
  } catch (e) {
    // Will redirect
  }
  return false;
}

async function loadState() {
  try {
    const data = await apiGet(`/api/data?month=${STATE.currentMonth}&year=${STATE.currentYear}`);
    
    if (data.habits && Array.isArray(data.habits) && data.habits.length > 0) {
      habits = data.habits;
    } else {
      habits = DEFAULT_HABITS.map((h) => ({
        id: generateId(),
        name: h.name,
        goal: h.goal,
        difficulty: h.difficulty,
        checks: {},
      }));
    }

    notes = data.notes || {};

    if (data.settings) {
      STATE.coins = data.settings.coins || 0;
      STATE.medals = data.settings.medals || { bronze: 0, silver: 0, gold: 0, honor: 0 };
      STATE.darkMode = data.settings.darkMode || false;
      STATE.soundEnabled = data.settings.soundEnabled !== false;
      achievements = data.settings.achievements || {};
    }

    rewards = data.rewards || [];
    examScores = data.examScores || [];
    wishlistItems = data.wishlistItems || [];

    if (!achievements || Object.keys(achievements).length === 0) {
      resetAchievements();
    }
    updateMedalsDisplay();
  } catch (err) {
    console.error('Failed to load data:', err);
    habits = DEFAULT_HABITS.map(h => ({
      id: generateId(),
      name: h.name,
      goal: h.goal,
      difficulty: h.difficulty,
      checks: {},
    }));
    notes = {};
    rewards = [];
    resetAchievements();
  }
}

function resetAchievements() {
  achievements = {};
  Object.keys(ACHIEVEMENT_DEFS).forEach(k => {
    achievements[k] = { unlocked: false, date: null };
  });
}

const debouncedSaveApi = (function() {
  let timer;
  return function() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await apiPost('/api/save', {
          month: STATE.currentMonth,
          year: STATE.currentYear,
          habits,
          notes,
          settings: {
            coins: STATE.coins,
            medals: STATE.medals,
            darkMode: STATE.darkMode,
            soundEnabled: STATE.soundEnabled,
            achievements,
          },
          rewards,
          examScores,
          wishlistItems,
        });
      } catch (err) {
        console.error('Failed to save:', err);
      }
    }, 500);
  };
})();

function saveState() {
  debouncedSaveApi();
}

/* ─────────────────────────────────────────────
   3. UTILITY FUNCTIONS
   ───────────────────────────────────────────── */

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns weekday for day 1 of the month, 0 = Monday … 6 = Sunday */
function getFirstDayOfMonth(month, year) {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1; // convert to Mon=0
}

/** dayIndex is 0-based (day 1 = index 0). Returns week 0-4. */
function getWeekForDay(dayIndex) {
  return Math.min(Math.floor(dayIndex / 7), 4);
}

function showToast(message, icon = '✨') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '24px';
    container.style.right = '24px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.style.background = '#111526';
  toast.style.border = '1px solid var(--border-glow)';
  toast.style.borderRadius = '12px';
  toast.style.padding = '14px 20px';
  toast.style.color = '#ffffff';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(99, 102, 241, 0.3)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.animation = 'popIn 0.3s ease';
  toast.innerHTML = `<span style="font-size: 20px;">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function generateId() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function lerp(a, b, t) { return a + (b - a) * t; }

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

/* ─────────────────────────────────────────────
   4. INITIALIZATION
   ───────────────────────────────────────────── */

async function init() {
  const authed = await checkAuth();
  if (!authed) return;

  updateUserDisplay();
  await loadState();

  if (STATE.darkMode) {
    $('#app').classList.add('dark-mode');
  }

  populateSelectors();
  buildGrid();
  buildWeekTabs();
  drawAllCharts();
  updateProgressTable();
  updateTopHabits();
  updateDailyStats();
  calculateStreaks();
  updateStreaksDisplay();
  checkAchievements();
  updateAchievementsDisplay();
  updateRewardShop();
  updateCoinDisplay();
  buildHeatmap();
  calculatePrediction();
  renderExamScores();
  renderWishlistItems();
  fetchLeaderboard();
  bindEvents();

  updateThemeButton();
  updateSoundButton();

  // Auto-open Weekly Check-in reflection popup only on Mondays (1 = Monday)
  const isMonday = new Date().getDay() === 1;
  if (isMonday) {
    setTimeout(() => {
      openReflectionModal();
    }, 600);
  }
}

function updateUserDisplay() {
  const headerControls = document.querySelector('.header-controls');
  if (headerControls && currentUser && !document.getElementById('user-display-wrapper')) {
    const userEl = document.createElement('div');
    userEl.id = 'user-display-wrapper';
    userEl.style.display = 'inline-flex';
    userEl.style.alignItems = 'center';
    userEl.style.gap = '8px';
    userEl.style.marginRight = '12px';
    userEl.innerHTML = `
      <span style="font-size: 14px; font-weight: 600; color: var(--text-primary);">👤 ${currentUser.displayName || currentUser.username}</span>
      <button class="btn-icon" id="logout-btn" title="Logout" style="cursor: pointer;">🚪</button>
    `;
    headerControls.prepend(userEl);

    document.getElementById('logout-btn').addEventListener('click', async () => {
      try {
        await fetch('/auth/logout', { method: 'POST' });
      } catch (e) {}
      window.location.href = '/login.html';
    });
  }

  const mottoBanner = document.getElementById('motto-banner');
  const examLabel = document.getElementById('exam-tracker-label');
  const wishLabel = document.getElementById('wishlist-label');

  if (currentUser) {
    const isAsM = currentUser.username === 'AsM' || currentUser.email === 'agnives46@gmail.com';
    if (mottoBanner) mottoBanner.style.display = isAsM ? 'flex' : 'none';
    if (examLabel) examLabel.textContent = isAsM ? '📊 SSC MOCK ANALYTICS' : '📊 EXAM & GOAL ANALYTICS';
    if (wishLabel) wishLabel.textContent = isAsM ? '🏍️ NYX GARAGE PROGRESS' : '🎁 PERSONAL WISHLIST & SAVINGS';
    updateMottoBanner();
  }
}

function updateMottoBanner() {
  const textEl = document.getElementById('motto-text-display');
  const rulesEl = document.getElementById('motto-rules-display');
  
  if (textEl && STATE.motto) {
    textEl.textContent = STATE.motto;
  }
  if (rulesEl && STATE.rules && Array.isArray(STATE.rules) && STATE.rules.length > 0) {
    rulesEl.innerHTML = STATE.rules.map(r => `<span>${r}</span>`).join('');
  }
}

function drawAllCharts() {
  drawDailyProgressChart();
  drawOverallProgressRing();
  drawOverviewDonut();
  drawWeeklyAreaChart();
}

document.addEventListener('DOMContentLoaded', init);

/* ─────────────────────────────────────────────
   5. SELECTORS / DROPDOWNS
   ───────────────────────────────────────────── */

function populateSelectors() {
  const monthSel = $('#month-select');
  const yearSel  = $('#year-select');
  if (!monthSel || !yearSel) return;

  // Months
  monthSel.innerHTML = '';
  MONTH_NAMES.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = name;
    if (i === STATE.currentMonth) opt.selected = true;
    monthSel.appendChild(opt);
  });

  // Years (2020 – 2030)
  yearSel.innerHTML = '';
  for (let y = 2020; y <= 2030; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === STATE.currentYear) opt.selected = true;
    yearSel.appendChild(opt);
  }

  updateMonthDisplay();
}

function updateMonthDisplay() {
  const el = $('#month-display');
  if (el) el.textContent = `${MONTH_NAMES[STATE.currentMonth]} ${STATE.currentYear}`;
}

/* ─────────────────────────────────────────────
   6. GRID BUILDING
   ───────────────────────────────────────────── */

function buildGrid() {
  const thead = $('#grid-thead');
  const tbody = $('#grid-tbody');
  if (!thead || !tbody) return;

  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);

  // --- HEADER ---
  thead.innerHTML = '';

  // Row 1: Week group headers
  const weekRow = document.createElement('tr');
  weekRow.innerHTML = '<th class="corner-cell" colspan="3">Habit & Progress</th>';
  for (let w = 0; w < 5; w++) {
    const startDay = w * 7 + 1;
    const endDay   = Math.min((w + 1) * 7, daysInMonth);
    if (startDay > daysInMonth) break;
    const span = endDay - startDay + 1;
    weekRow.innerHTML += `<th colspan="${span}" class="week-header">Week ${w + 1}</th>`;
  }
  thead.appendChild(weekRow);

  // Row 2: Day-of-week letters
  const letterRow = document.createElement('tr');
  letterRow.innerHTML = '<th class="habit-header-name">Habit</th><th class="habit-header-pct">%</th><th class="habit-header-goal">Goal</th>';
  const firstDay = getFirstDayOfMonth(STATE.currentMonth, STATE.currentYear);
  for (let d = 0; d < daysInMonth; d++) {
    const dow = (firstDay + d) % 7; // 0=Mon
    letterRow.innerHTML += `<th class="day-letter">${DAY_LETTERS[dow]}</th>`;
  }
  thead.appendChild(letterRow);

  // Row 3: Day numbers (clickable for notes)
  const numRow = document.createElement('tr');
  numRow.innerHTML = '<th></th><th></th><th></th>';
  const now = new Date();
  const isCurrentMonth = STATE.currentMonth === now.getMonth() && STATE.currentYear === now.getFullYear();
  const todayIndex = now.getDate() - 1;

  for (let d = 0; d < daysInMonth; d++) {
    const hasNote = notes[d] && notes[d].trim().length > 0;
    const isToday = isCurrentMonth && d === todayIndex;
    numRow.innerHTML += `<th class="day-number ${hasNote ? 'has-note' : ''} ${isToday ? 'today-column' : ''}" data-day="${d}" title="${hasNote ? 'Has note — click to view' : 'Click to add note'}">${d + 1}</th>`;
  }
  thead.appendChild(numRow);

  // --- BODY (habit rows) ---
  tbody.innerHTML = '';

  habits.forEach((habit, hi) => {
    const tr = document.createElement('tr');

    // Name cell
    const nameTd = document.createElement('td');
    nameTd.className = 'habit-name-cell';
    nameTd.innerHTML = `
      <span class="habit-label">${habit.name}</span>
      <span class="difficulty-badge difficulty-${habit.difficulty}">${habit.difficulty}</span>
      <button class="edit-habit-btn" data-index="${hi}" title="Edit">✏️</button>
      <button class="delete-habit-btn" data-index="${hi}" title="Delete">🗑️</button>
    `;
    tr.appendChild(nameTd);

    const checked = habit.checks || {};
    const totalChecked = Object.values(checked).filter(Boolean).length;
    const pct = habit.goal > 0 ? Math.round((totalChecked / habit.goal) * 100) : 0;

    // Progress cells placed immediately next to Habit Name!
    const pctTd = document.createElement('td');
    pctTd.className = 'progress-pct sticky-progress-pct';
    pctTd.textContent = `${Math.min(pct, 100)}%`;
    tr.appendChild(pctTd);

    const goalTd = document.createElement('td');
    goalTd.className = 'progress-goal sticky-progress-goal';
    goalTd.textContent = `${totalChecked}/${habit.goal}`;
    tr.appendChild(goalTd);

    // Day cells follow after Progress columns
    for (let d = 0; d < daysInMonth; d++) {
      const td = document.createElement('td');
      const wk = getWeekForDay(d);
      const isToday = isCurrentMonth && d === todayIndex;
      td.className = `habit-cell week-${wk + 1} ${isToday ? 'today-column' : ''}`;
      td.dataset.habit = hi;
      td.dataset.day   = d;
      if (checked[d]) td.classList.add('checked');
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  // Auto-scroll grid to today's date if viewing current month and year
  setTimeout(() => {
    const now = new Date();
    if (STATE.currentMonth === now.getMonth() && STATE.currentYear === now.getFullYear()) {
      const todayNumCell = document.querySelector(`.day-number[data-day="${now.getDate() - 1}"]`);
      const gridWrapper = document.querySelector('.habit-grid-wrapper');
      if (todayNumCell && gridWrapper) {
        const cellLeft = todayNumCell.offsetLeft;
        const wrapperWidth = gridWrapper.clientWidth;
        gridWrapper.scrollTo({
          left: Math.max(0, cellLeft - (wrapperWidth / 2) + 20),
          behavior: 'smooth'
        });
      }
    }
  }, 150);
}

/* ─────────────────────────────────────────────
   7. CELL INTERACTION
   ───────────────────────────────────────────── */

function toggleCell(habitIndex, dayIndex) {
  const habit = habits[habitIndex];
  if (!habit) return;

  // 48-Hour Lock Validation
  const now = new Date();
  const cellDate = new Date(STATE.currentYear, STATE.currentMonth, dayIndex + 1, 23, 59, 59);
  const diffMs = now.getTime() - cellDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 48) {
    showToast('🔒 Locked — Cannot edit habit entries older than 48 hours!', 'error');
    playSound('uncheck');
    return;
  }

  const wasChecked = !!habit.checks[dayIndex];
  habit.checks[dayIndex] = !wasChecked;

  // Coins
  const coinDelta = DIFFICULTY_COINS[habit.difficulty] || 1;
  if (!wasChecked) {
    STATE.coins += coinDelta;
    playSound('check');
  } else {
    STATE.coins = Math.max(0, STATE.coins - coinDelta);
    playSound('uncheck');
  }

  saveState();

  // Update UI
  buildGrid(); // rebuild grid (fast enough for this size)
  drawAllCharts();
  updateProgressTable();
  updateTopHabits();
  updateDailyStats();
  calculateStreaks();
  updateStreaksDisplay();
  checkAchievements();
  updateAchievementsDisplay();
  updateRewardShop();
  updateCoinDisplay();
  updateMedalsDisplay();
  calculatePrediction();
}

function updateCoinDisplay() {
  const el = $('#coin-count');
  if (el) el.textContent = STATE.coins;
}

function updateMedalsDisplay() {
  const b = $('#medal-bronze-count');
  const s = $('#medal-silver-count');
  const g = $('#medal-gold-count');
  const h = $('#medal-honor-count');
  if (b) b.textContent = STATE.medals?.bronze || 0;
  if (s) s.textContent = STATE.medals?.silver || 0;
  if (g) g.textContent = STATE.medals?.gold || 0;
  if (h) h.textContent = STATE.medals?.honor || 0;
}

/* ─────────────────────────────────────────────
   8. CHART – Daily Progress Bar Chart
   ───────────────────────────────────────────── */

function drawDailyProgressChart() {
  const canvas = $('#daily-progress-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = canvas.parentElement ? canvas.parentElement.clientWidth || 600 : 600;
  const H = canvas.height = 260;
  ctx.clearRect(0, 0, W, H);

  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const totalHabits = habits.length || 1;

  // Compute per-day completion %
  const data = [];
  for (let d = 0; d < daysInMonth; d++) {
    let count = 0;
    habits.forEach(h => { if (h.checks && h.checks[d]) count++; });
    data.push(count / totalHabits);
  }

  const pad = { top: 30, right: 20, bottom: 35, left: 45 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = Math.max(chartW / daysInMonth - 2, 3);

  const isDark = STATE.darkMode;
  const textColor = isDark ? '#ccc' : '#555';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  // Grid lines & Y labels
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [0, 0.25, 0.5, 0.75, 1].forEach(v => {
    const y = pad.top + chartH * (1 - v);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(`${Math.round(v * 100)}%`, pad.left - 6, y);
  });

  // Bars
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, ACCENT);
  grad.addColorStop(1, ACCENT2);

  data.forEach((val, i) => {
    const x = pad.left + (chartW / daysInMonth) * i + 1;
    const bh = val * chartH;
    const y  = pad.top + chartH - bh;

    ctx.fillStyle = grad;
    ctx.beginPath();
    const r = Math.min(barW / 2, 4);
    roundRect(ctx, x, y, barW, bh, r);
    ctx.fill();
  });

  // X labels (day numbers)
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '10px Inter, sans-serif';
  const step = daysInMonth > 20 ? 2 : 1;
  for (let d = 0; d < daysInMonth; d += step) {
    const x = pad.left + (chartW / daysInMonth) * d + barW / 2;
    ctx.fillText(d + 1, x, pad.top + chartH + 6);
  }
}

/** Helper: rounded rect */
function roundRect(ctx, x, y, w, h, r) {
  if (h <= 0) return;
  r = Math.min(r, h / 2, w / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ─────────────────────────────────────────────
   9. CHART – Overall Progress Ring
   ───────────────────────────────────────────── */

function drawOverallProgressRing() {
  const canvas = $('#overall-progress-ring');
  if (!canvas) return;
  canvas.width = 160;
  canvas.height = 160;

  const total = habits.reduce((s, h) => s + h.goal, 0) || 1;
  const done  = habits.reduce((s, h) => s + Object.values(h.checks || {}).filter(Boolean).length, 0);
  const pct   = clamp(done / total, 0, 1);

  // Update text
  const compEl = $('#progress-completed');
  const totEl  = $('#progress-total');
  if (compEl) compEl.textContent = done;
  if (totEl)  totEl.textContent  = total;

  animateRing(canvas, pct, ACCENT, 600);
}

function animateRing(canvas, targetPct, color, duration) {
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = cx - 14;
  const lineW  = 12;
  const start  = -Math.PI / 2;
  let startTime = null;

  const bgColor = STATE.darkMode ? '#333' : GRAY_BG;

  function frame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    const t = Math.min(elapsed / duration, 1);
    const val = easeOutCubic(t) * targetPct;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Foreground ring
    if (val > 0) {
      const endAngle = start + Math.PI * 2 * val;
      const grad = ctx.createConicGradient(start, cx, cy);
      grad.addColorStop(0, color);
      grad.addColorStop(val, ACCENT2);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, start, endAngle);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Center text
    ctx.fillStyle = STATE.darkMode ? '#eee' : '#333';
    ctx.font = 'bold 26px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(val * 100)}%`, cx, cy);

    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ─────────────────────────────────────────────
   10. CHART – Overview Donut
   ───────────────────────────────────────────── */

function drawOverviewDonut() {
  const canvas = $('#overview-donut');
  if (!canvas) return;
  canvas.width = 150;
  canvas.height = 150;

  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const totalPossible = habits.length * daysInMonth || 1;
  const totalDone = habits.reduce((s, h) => s + Object.values(h.checks || {}).filter(Boolean).length, 0);
  const pct = clamp(totalDone / totalPossible, 0, 1);

  const compEl = $('#overview-completed');
  const totEl  = $('#overview-total');
  if (compEl) compEl.textContent = totalDone;
  if (totEl)  totEl.textContent  = totalPossible;

  animateRing(canvas, pct, GREEN, 600);
}

/* ─────────────────────────────────────────────
   11. CHART – Weekly Area Chart
   ───────────────────────────────────────────── */

function drawWeeklyAreaChart() {
  const canvas = $('#weekly-area-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = canvas.parentElement ? canvas.parentElement.clientWidth || 500 : 500;
  const H = canvas.height = 220;
  ctx.clearRect(0, 0, W, H);

  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const wk = STATE.activeWeekTab;
  const startD = wk * 7;
  const endD   = Math.min(startD + 7, daysInMonth);
  const weekDays = endD - startD;
  if (weekDays <= 0) return;

  const totalHabits = habits.length || 1;
  const data = [];
  for (let d = startD; d < endD; d++) {
    let count = 0;
    habits.forEach(h => { if (h.checks && h.checks[d]) count++; });
    data.push(count);
  }

  const pad = { top: 20, right: 20, bottom: 35, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const maxVal = totalHabits;
  const isDark = STATE.darkMode;
  const textColor = isDark ? '#ccc' : '#555';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  // Grid
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= maxVal; v += Math.max(1, Math.floor(maxVal / 4))) {
    const y = pad.top + chartH * (1 - v / maxVal);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(W - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(v, pad.left - 6, y);
  }

  // Points
  const points = data.map((v, i) => ({
    x: pad.left + (chartW / (weekDays - 1 || 1)) * i,
    y: pad.top + chartH * (1 - v / maxVal),
  }));

  // Area fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
  grad.addColorStop(0, isDark ? 'rgba(108,99,255,0.35)' : 'rgba(108,99,255,0.25)');
  grad.addColorStop(1, 'rgba(108,99,255,0.02)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, pad.top + chartH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X labels
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '11px Inter, sans-serif';
  points.forEach((p, i) => {
    ctx.fillText(`Day ${startD + i + 1}`, p.x, pad.top + chartH + 8);
  });
}

/* ─────────────────────────────────────────────
   12. WEEK TABS
   ───────────────────────────────────────────── */

function buildWeekTabs() {
  const container = $('#week-tabs');
  if (!container) return;
  container.innerHTML = '';

  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const numWeeks = Math.ceil(daysInMonth / 7);

  for (let w = 0; w < numWeeks; w++) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (w === STATE.activeWeekTab ? ' active' : '');
    btn.textContent = `Week ${w + 1}`;
    btn.dataset.week = w;
    container.appendChild(btn);
  }
}

function switchWeekTab(weekIndex) {
  STATE.activeWeekTab = weekIndex;

  // Update active class
  $$('#week-tabs .tab-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.week) === weekIndex);
  });

  drawWeeklyAreaChart();
  updateDailyStats();
  saveState();
}

/* ─────────────────────────────────────────────
   13. PROGRESS TABLE
   ───────────────────────────────────────────── */

function updateProgressTable() {
  const tbody = $('#progress-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  habits.forEach(habit => {
    const checked = Object.values(habit.checks || {}).filter(Boolean).length;
    const pct = habit.goal > 0 ? Math.min(Math.round((checked / habit.goal) * 100), 100) : 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-habit-name">${habit.name}</td>
      <td>${habit.goal}</td>
      <td>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width:${pct}%;background:${pct >= 100 ? GREEN : ACCENT}"></div>
        </div>
        <span class="progress-bar-label">${pct}%</span>
      </td>
      <td>${checked} / ${habit.goal}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ─────────────────────────────────────────────
   14. TOP 10 HABITS
   ───────────────────────────────────────────── */

function updateTopHabits() {
  const container = $('#top-habits-list');
  if (!container) return;
  container.innerHTML = '';

  const ranked = habits.map(h => {
    const checked = Object.values(h.checks || {}).filter(Boolean).length;
    const pct = h.goal > 0 ? (checked / h.goal) * 100 : 0;
    return { name: h.name, pct: Math.min(pct, 100) };
  }).sort((a, b) => b.pct - a.pct).slice(0, 10);

  ranked.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'top-habit-item';
    div.innerHTML = `
      <span class="rank">${i + 1}.</span>
      <span class="top-name">${item.name}</span>
      <div class="top-bar-container">
        <div class="top-bar-fill" style="width:${item.pct}%"></div>
      </div>
      <span class="top-pct">${Math.round(item.pct)}%</span>
    `;
    container.appendChild(div);
  });
}

/* ─────────────────────────────────────────────
   15. DAILY / WEEKLY STATS
   ───────────────────────────────────────────── */

function updateDailyStats() {
  const wk = STATE.activeWeekTab;
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const startD = wk * 7;
  const endD   = Math.min(startD + 7, daysInMonth);
  const weekDays = endD - startD;
  const totalHabits = habits.length || 1;

  let totalDone = 0;
  for (let d = startD; d < endD; d++) {
    habits.forEach(h => { if (h.checks && h.checks[d]) totalDone++; });
  }

  const dailyGoal   = totalHabits;
  const avgComplete = weekDays > 0 ? Math.round(totalDone / weekDays) : 0;
  const avgIncomplete = dailyGoal - avgComplete;
  const weeklyPct   = weekDays > 0 ? Math.round((totalDone / (totalHabits * weekDays)) * 100) : 0;

  const statsEl = $('#daily-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-box"><span class="stat-label">Daily Goal:</span> <span class="stat-value">${dailyGoal}</span></div>
      <div class="stat-box"><span class="stat-label">Avg Complete:</span> <span class="stat-value">${avgComplete}</span></div>
      <div class="stat-box"><span class="stat-label">Avg Incomplete:</span> <span class="stat-value">${avgIncomplete}</span></div>
    `;
  }

  const weeklyEl = $('#weekly-progress-stats');
  if (weeklyEl) {
    weeklyEl.innerHTML = `<div class="stat-box"><span class="stat-label">Weekly Progress:</span> <span class="stat-value">${weeklyPct}%</span></div>`;
  }
}

/* ─────────────────────────────────────────────
   16. STREAKS
   ───────────────────────────────────────────── */

let streaksData = [];

function calculateStreaks() {
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const today = new Date();
  const isCurrentMonth = (STATE.currentMonth === today.getMonth() && STATE.currentYear === today.getFullYear());
  const currentDay = isCurrentMonth ? today.getDate() - 1 : daysInMonth - 1; // 0-based

  streaksData = habits.map(h => {
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;

    // Calculate longest streak
    for (let d = 0; d < daysInMonth; d++) {
      if (h.checks && h.checks[d]) {
        streak++;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }

    // Current streak (consecutive days ending at today or last day)
    currentStreak = 0;
    for (let d = currentDay; d >= 0; d--) {
      if (h.checks && h.checks[d]) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      habitName: h.name,
      difficulty: h.difficulty,
      currentStreak,
      longestStreak,
    };
  });
}

function updateStreaksDisplay() {
  const container = $('#streaks-list');
  if (!container) return;
  container.innerHTML = '';

  if (streaksData.length === 0) {
    container.innerHTML = '<p class="empty-msg">No habits yet.</p>';
    return;
  }

  // Sort by current streak descending
  const sorted = [...streaksData].sort((a, b) => b.currentStreak - a.currentStreak);

  sorted.forEach(s => {
    const div = document.createElement('div');
    div.className = 'streak-item';
    const fire = s.currentStreak >= 3 ? '🔥' : '';
    div.innerHTML = `
      <span class="streak-name">${s.habitName}</span>
      <span class="streak-current">${fire} ${s.currentStreak} day${s.currentStreak !== 1 ? 's' : ''}</span>
      <span class="streak-longest">Best: ${s.longestStreak}</span>
    `;
    container.appendChild(div);
  });
}

/* ─────────────────────────────────────────────
   17. ACHIEVEMENTS
   ───────────────────────────────────────────── */

function checkAchievements() {
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);

  // 7day_warrior: any habit has 7+ day streak
  if (!achievements['7day_warrior']?.unlocked) {
    if (streaksData.some(s => s.longestStreak >= 7)) {
      unlockAchievement('7day_warrior');
    }
  }

  // perfect_week: all habits checked for any 7 consecutive days
  if (!achievements['perfect_week']?.unlocked) {
    for (let start = 0; start <= daysInMonth - 7; start++) {
      let allPerfect = true;
      for (let d = start; d < start + 7 && allPerfect; d++) {
        for (const h of habits) {
          if (!(h.checks && h.checks[d])) { allPerfect = false; break; }
        }
      }
      if (allPerfect && habits.length > 0) {
        unlockAchievement('perfect_week');
        break;
      }
    }
  }

  // perfect_month: 100% completion
  if (!achievements['perfect_month']?.unlocked) {
    const totalPossible = habits.length * daysInMonth;
    const totalDone = habits.reduce((s, h) => s + Object.values(h.checks || {}).filter(Boolean).length, 0);
    if (totalPossible > 0 && totalDone >= totalPossible) {
      unlockAchievement('perfect_month');
    }
  }

  // iron_will: 30-day streak on a hard habit
  if (!achievements['iron_will']?.unlocked) {
    if (streaksData.some(s => s.difficulty === 'hard' && s.longestStreak >= 30)) {
      unlockAchievement('iron_will');
    }
  }

  // shopaholic: 5+ rewards redeemed
  if (!achievements['shopaholic']?.unlocked) {
    const redeemed = rewards.filter(r => r.redeemed).length;
    if (redeemed >= 5) {
      unlockAchievement('shopaholic');
    }
  }

  saveState();
}

function unlockAchievement(id) {
  if (achievements[id]?.unlocked) return;
  achievements[id] = { unlocked: true, date: new Date().toISOString() };
  playSound('achievement');
  triggerConfetti();
  saveState();
}

function updateAchievementsDisplay() {
  const container = $('#achievements-list');
  if (!container) return;
  container.innerHTML = '';

  Object.entries(ACHIEVEMENT_DEFS).forEach(([id, def]) => {
    const status = achievements[id] || { unlocked: false };
    const div = document.createElement('div');
    div.className = 'achievement-badge' + (status.unlocked ? ' unlocked' : ' locked');
    div.innerHTML = `
      <span class="ach-emoji">${def.emoji}</span>
      <span class="ach-label">${def.label}</span>
      <span class="ach-desc">${def.desc}</span>
      ${status.unlocked ? '<span class="ach-date">Unlocked ' + new Date(status.date).toLocaleDateString() + '</span>' : '<span class="ach-lock">🔒</span>'}
    `;
    container.appendChild(div);
  });
}

/* ─────────────────────────────────────────────
   18. CONFETTI
   ───────────────────────────────────────────── */

function triggerConfetti() {
  const container = $('#confetti-container');
  if (!container) return;
  container.style.display = 'block';

  const colors = ['#6c63ff', '#ff6584', '#27ae60', '#f1c40f', '#e67e22', '#3498db', '#e74c3c', '#9b59b6'];
  const count = 70 + Math.floor(Math.random() * 30);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${1.5 + Math.random() * 1.5}s ease-out forwards;
      animation-delay: ${Math.random() * 0.5}s;
      transform: rotate(${Math.random() * 360}deg);
      opacity: ${0.7 + Math.random() * 0.3};
    `;
    container.appendChild(piece);
  }

  // Inject keyframes once
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.textContent = `
      @keyframes confetti-fall {
        0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(${360 + Math.random() * 720}deg); opacity: 0; }
      }
      .confetti-piece { position: absolute; pointer-events: none; }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    container.innerHTML = '';
    container.style.display = 'none';
  }, 3000);
}

/* ─────────────────────────────────────────────
   19. REWARD SHOP
   ───────────────────────────────────────────── */

function getMonthlyCompletion() {
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const totalPossible = habits.length * daysInMonth || 1;
  const totalDone = habits.reduce((s, h) => s + Object.values(h.checks || {}).filter(Boolean).length, 0);
  return totalDone / totalPossible;
}

function updateRewardShop() {
  const completion = getMonthlyCompletion();
  const shopUnlocked = completion >= 0.75;

  const statusEl = $('#shop-status');
  if (statusEl) {
    statusEl.textContent = shopUnlocked
      ? '🔓 Shop Unlocked!'
      : `🔒 Locked — Reach 75% completion to unlock (currently ${Math.round(completion * 100)}%)`;
    statusEl.className = shopUnlocked ? 'shop-unlocked' : 'shop-locked';
  }

  // Rewards grid
  const grid = $('#rewards-grid');
  if (grid) {
    grid.innerHTML = '';
    rewards.forEach(r => {
      const reqM = r.requiredMedals || { bronze: 0, silver: 0, gold: 0, honor: 0 };
      const userM = STATE.medals || { bronze: 0, silver: 0, gold: 0, honor: 0 };
      const hasMedals = (userM.bronze >= (reqM.bronze||0)) &&
                        (userM.silver >= (reqM.silver||0)) &&
                        (userM.gold >= (reqM.gold||0)) &&
                        (userM.honor >= (reqM.honor||0));

      const canBuy = shopUnlocked && !r.redeemed && STATE.coins >= r.cost && hasMedals;
      
      let reqMedalsHTML = '';
      if (reqM.bronze > 0) reqMedalsHTML += `<span style="font-size:11px;background:rgba(217,119,6,0.2);color:#f59e0b;padding:2px 6px;border-radius:6px;border:1px solid #d97706;">🥉 x${reqM.bronze}</span> `;
      if (reqM.silver > 0) reqMedalsHTML += `<span style="font-size:11px;background:rgba(148,163,184,0.2);color:#cbd5e1;padding:2px 6px;border-radius:6px;border:1px solid #94a3b8;">🥈 x${reqM.silver}</span> `;
      if (reqM.gold > 0) reqMedalsHTML += `<span style="font-size:11px;background:rgba(234,179,8,0.2);color:#eab308;padding:2px 6px;border-radius:6px;border:1px solid #eab308;">🥇 x${reqM.gold}</span> `;
      if (reqM.honor > 0) reqMedalsHTML += `<span style="font-size:11px;background:rgba(168,85,247,0.2);color:#a855f7;padding:2px 6px;border-radius:6px;border:1px solid #a855f7;">🏅 x${reqM.honor}</span> `;

      const div = document.createElement('div');
      div.className = 'reward-item' + (r.redeemed ? ' redeemed' : '') + (!shopUnlocked || !hasMedals ? ' locked' : '');
      div.innerHTML = `
        <span class="reward-emoji">${r.emoji}</span>
        <span class="reward-name">${r.name}</span>
        <span class="reward-cost">🪙 ${r.cost}</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:4px 0;">${reqMedalsHTML}</div>
        ${r.redeemed
          ? '<span class="reward-status">✅ Redeemed</span>'
          : `<button class="buy-reward-btn" data-id="${r.id}" ${canBuy ? '' : 'disabled'}>${!hasMedals ? '🔒 Needs Medals' : shopUnlocked ? 'Claim Trophy' : '🔒 Shop Locked'}</button>`
        }
      `;
      grid.appendChild(div);
    });
  }

  // Redeemed list
  const redeemedList = $('#redeemed-list');
  if (redeemedList) {
    const redeemed = rewards.filter(r => r.redeemed);
    if (redeemed.length === 0) {
      redeemedList.innerHTML = '<p class="empty-msg">No rewards redeemed yet.</p>';
    } else {
      redeemedList.innerHTML = '';
      redeemed.forEach(r => {
        const div = document.createElement('div');
        div.className = 'redeemed-item';
        div.innerHTML = `${r.emoji} ${r.name} <span class="redeemed-date">${r.redeemedDate ? new Date(r.redeemedDate).toLocaleDateString() : ''}</span>`;
        redeemedList.appendChild(div);
      });
    }
  }
}

function buyReward(rewardId) {
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward || reward.redeemed) return;
  if (STATE.coins < reward.cost) {
    showToast('🪙 Need more coins to unlock this trophy!', 'error');
    return;
  }
  if (getMonthlyCompletion() < 0.75) {
    showToast('🔒 Reach 75% monthly completion to unlock the shop!', 'error');
    return;
  }

  const reqM = reward.requiredMedals || { bronze: 0, silver: 0, gold: 0, honor: 0 };
  const userM = STATE.medals || { bronze: 0, silver: 0, gold: 0, honor: 0 };
  if ((userM.bronze < (reqM.bronze||0)) || (userM.silver < (reqM.silver||0)) || (userM.gold < (reqM.gold||0)) || (userM.honor < (reqM.honor||0))) {
    showToast('🔒 Trophy Locked — You need more Medals to earn this prestige trophy!', 'error');
    return;
  }

  STATE.coins -= reward.cost;
  reward.redeemed = true;
  reward.redeemedDate = new Date().toISOString();

  playSound('buy');
  triggerConfetti();
  saveState();
  updateCoinDisplay();
  updateRewardShop();
  checkAchievements();
  updateAchievementsDisplay();
  showToast(`🏆 Congratulations! You unlocked ${reward.name} guilt-free!`, 'success');
}

function addReward(name, cost, emoji) {
  rewards.push({
    id: generateId(),
    name,
    emoji: emoji || '🎁',
    cost: parseInt(cost) || 10,
    redeemed: false,
    redeemedDate: null,
  });
  saveState();
  updateRewardShop();
}

/* ─────────────────────────────────────────────
   20. THEME TOGGLE
   ───────────────────────────────────────────── */

function toggleTheme() {
  STATE.darkMode = !STATE.darkMode;
  $('#app').classList.toggle('dark-mode', STATE.darkMode);
  updateThemeButton();
  saveState();
  drawAllCharts();
  buildHeatmap();
}

function updateThemeButton() {
  const btn = $('#theme-toggle');
  if (btn) btn.textContent = STATE.darkMode ? '☀️ Light Theme' : '🌙 Dark Theme';
}

/* ─────────────────────────────────────────────
   21. SOUND EFFECTS (Web Audio API)
   ───────────────────────────────────────────── */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, startDelay, type) {
  if (!STATE.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  } catch (_) { /* audio not available */ }
}

function playSound(type) {
  if (!STATE.soundEnabled) return;
  switch (type) {
    case 'check':
      playTone(880, 0.1, 0, 'sine');
      break;
    case 'uncheck':
      playTone(440, 0.08, 0, 'triangle');
      break;
    case 'achievement':
      playTone(440, 0.15, 0, 'sine');
      playTone(554, 0.15, 0.12, 'sine');
      playTone(659, 0.15, 0.24, 'sine');
      playTone(880, 0.25, 0.36, 'sine');
      break;
    case 'streak':
      playTone(660, 0.12, 0, 'square');
      playTone(880, 0.15, 0.1, 'square');
      break;
    case 'buy':
      playTone(523, 0.08, 0, 'square');
      playTone(659, 0.08, 0.07, 'square');
      playTone(784, 0.08, 0.14, 'square');
      playTone(1047, 0.15, 0.21, 'sine');
      break;
  }
}

function toggleSound() {
  STATE.soundEnabled = !STATE.soundEnabled;
  updateSoundButton();
  saveState();
}

function updateSoundButton() {
  const btn = $('#sound-toggle');
  if (btn) btn.textContent = STATE.soundEnabled ? '🔊' : '🔇';
}

/* ─────────────────────────────────────────────
   22. HEATMAP
   ───────────────────────────────────────────── */

function buildHeatmap() {
  const container = $('#heatmap-container');
  if (!container) return;
  container.innerHTML = '';

  const year = STATE.currentYear;
  const isDark = STATE.darkMode;

  // Colors
  const levels = isDark
    ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
    : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

  // Month labels
  const labelsDiv = document.createElement('div');
  labelsDiv.className = 'heatmap-months';
  MONTH_NAMES.forEach(m => {
    const span = document.createElement('span');
    span.className = 'heatmap-month-label';
    span.textContent = m.slice(0, 3);
    labelsDiv.appendChild(span);
  });
  container.appendChild(labelsDiv);

  const gridDiv = document.createElement('div');
  gridDiv.className = 'heatmap-grid';

  // Iterate over every day of the year
  for (let m = 0; m < 12; m++) {
    const dim = getDaysInMonth(m, year);

    // Load habits for that month (from localStorage)
    let monthHabits;
    try {
      const raw = localStorage.getItem(habitsKey(m, year));
      monthHabits = raw ? JSON.parse(raw) : null;
    } catch (_) { monthHabits = null; }

    // If it's the current displayed month, use live data
    if (m === STATE.currentMonth && year === STATE.currentYear) {
      monthHabits = habits;
    }

    for (let d = 0; d < dim; d++) {
      let pct = 0;
      if (monthHabits && monthHabits.length > 0) {
        let count = 0;
        monthHabits.forEach(h => { if (h.checks && h.checks[d]) count++; });
        pct = count / monthHabits.length;
      }

      let level;
      if (pct === 0) level = 0;
      else if (pct <= 0.25) level = 1;
      else if (pct <= 0.50) level = 2;
      else if (pct <= 0.75) level = 3;
      else level = 4;

      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.backgroundColor = levels[level];
      cell.title = `${MONTH_NAMES[m]} ${d + 1}, ${year} — ${Math.round(pct * 100)}%`;
      gridDiv.appendChild(cell);
    }
  }
  container.appendChild(gridDiv);
}

/* ─────────────────────────────────────────────
   23. NOTES MODAL
   ───────────────────────────────────────────── */

let activeNoteDay = null;

function openNotesModal(dayIndex) {
  activeNoteDay = dayIndex;
  const title = $('#notes-modal-title');
  if (title) title.textContent = `Notes — ${MONTH_NAMES[STATE.currentMonth]} ${dayIndex + 1}`;

  const textarea = $('#notes-textarea');
  if (textarea) textarea.value = notes[dayIndex] || '';

  openModal('notes-modal-overlay');
}

function saveNote(dayIndex, text) {
  if (text && text.trim().length > 0) {
    notes[dayIndex] = text.trim();
  } else {
    delete notes[dayIndex];
  }
  saveState();
  buildGrid(); // update note indicators
}

/* ─────────────────────────────────────────────
   24. EXPORT
   ───────────────────────────────────────────── */

function exportAsImage() {
  const appEl = $('#app');
  if (!appEl) return;

  // Check for html2canvas
  if (typeof html2canvas === 'function') {
    html2canvas(appEl, { useCORS: true, scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `habit-tracker-${MONTH_NAMES[STATE.currentMonth]}-${STATE.currentYear}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(() => fallbackExport());
  } else {
    fallbackExport();
  }
}

function fallbackExport() {
  // Export data as JSON if html2canvas not available
  const data = {
    state: STATE,
    habits,
    notes,
    rewards,
    achievements,
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.download = `habit-tracker-${MONTH_NAMES[STATE.currentMonth]}-${STATE.currentYear}.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

/* ─────────────────────────────────────────────
   25. PREDICTIVE ANALYTICS
   ───────────────────────────────────────────── */

function calculatePrediction() {
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  const today = new Date();
  const isCurrentMonth = (STATE.currentMonth === today.getMonth() && STATE.currentYear === today.getFullYear());
  const daysPassed = isCurrentMonth ? today.getDate() : daysInMonth;

  const results = habits.map(h => {
    const checked = Object.values(h.checks || {}).filter(Boolean).length;
    const remaining = h.goal - checked;

    if (remaining <= 0) {
      return { name: h.name, status: 'completed', projected: null, onTrack: true };
    }

    const rate = daysPassed > 0 ? checked / daysPassed : 0;
    const daysNeeded = rate > 0 ? Math.ceil(remaining / rate) : Infinity;
    const daysLeft = daysInMonth - daysPassed;

    return {
      name: h.name,
      status: 'in_progress',
      rate: Math.round(rate * 100) / 100,
      daysNeeded,
      daysLeft,
      projected: daysNeeded <= daysLeft,
      onTrack: daysNeeded <= daysLeft,
      projectedCompletion: rate > 0 ? Math.round(rate * daysInMonth) : checked,
    };
  });

  // Display prediction info alongside progress ring or in a tooltip
  const ringCanvas = $('#overall-progress-ring');
  if (ringCanvas) {
    const onTrackCount = results.filter(r => r.onTrack).length;
    ringCanvas.title = `${onTrackCount}/${habits.length} habits on track to meet their goals this month`;
  }

  return results;
}

/* ─────────────────────────────────────────────
   26. MODAL HELPERS
   ───────────────────────────────────────────── */

function openModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.removeAttribute('hidden');
  overlay.style.setProperty('display', 'flex', 'important');
  requestAnimationFrame(() => overlay.classList.add('visible'));
}

function closeModal(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('hidden', 'true');
  overlay.style.setProperty('display', 'none', 'important');
}

function closeAllModals() {
  ['habit-modal-overlay', 'reward-modal-overlay', 'notes-modal-overlay', 'reflection-modal-overlay'].forEach(id => {
    closeModal(id);
  });
}

/* ─────────────────────────────────────────────
   27. EVENT LISTENERS
   ───────────────────────────────────────────── */

let editingHabitIndex = null;

function bindEvents() {
  // --- Month / Year selectors ---
  const monthSel = $('#month-select');
  const yearSel  = $('#year-select');

  if (monthSel) monthSel.addEventListener('change', () => {
    STATE.currentMonth = parseInt(monthSel.value);
    onMonthYearChange();
  });

  if (yearSel) yearSel.addEventListener('change', () => {
    STATE.currentYear = parseInt(yearSel.value);
    onMonthYearChange();
  });

  // --- Grid clicks (event delegation) ---
  const tbody = $('#grid-tbody');
  if (tbody) {
    tbody.addEventListener('click', e => {
      const cell = e.target.closest('.habit-cell');
      if (cell) {
        const hi = parseInt(cell.dataset.habit);
        const di = parseInt(cell.dataset.day);
        if (!isNaN(hi) && !isNaN(di)) toggleCell(hi, di);
        return;
      }
      // Edit button
      const editBtn = e.target.closest('.edit-habit-btn');
      if (editBtn) {
        editingHabitIndex = parseInt(editBtn.dataset.index);
        openHabitModal(editingHabitIndex);
        return;
      }
      // Delete button
      const delBtn = e.target.closest('.delete-habit-btn');
      if (delBtn) {
        const idx = parseInt(delBtn.dataset.index);
        if (confirm(`Delete "${habits[idx]?.name}"?`)) {
          habits.splice(idx, 1);
          saveState();
          refreshAll();
        }
        return;
      }
    });

    // Touch support
    tbody.addEventListener('touchend', e => {
      const cell = e.target.closest('.habit-cell');
      if (cell) {
        e.preventDefault();
        const hi = parseInt(cell.dataset.habit);
        const di = parseInt(cell.dataset.day);
        if (!isNaN(hi) && !isNaN(di)) toggleCell(hi, di);
      }
    }, { passive: false });
  }

  // --- Day number clicks (notes) ---
  const thead = $('#grid-thead');
  if (thead) {
    thead.addEventListener('click', e => {
      const dayNum = e.target.closest('.day-number');
      if (dayNum) {
        openNotesModal(parseInt(dayNum.dataset.day));
      }
    });
  }

  // --- Week tabs ---
  const weekTabsEl = $('#week-tabs');
  if (weekTabsEl) {
    weekTabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.tab-btn');
      if (btn) switchWeekTab(parseInt(btn.dataset.week));
    });
  }

  // --- Theme toggle ---
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // --- Sound toggle ---
  const soundBtn = $('#sound-toggle');
  if (soundBtn) soundBtn.addEventListener('click', toggleSound);

  // --- Export ---
  const exportBtn = $('#export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportAsImage);

  // --- Add Habit ---
  const addHabitBtn = $('#add-habit-btn');
  if (addHabitBtn) addHabitBtn.addEventListener('click', () => {
    editingHabitIndex = null;
    openHabitModal();
  });

  // --- Habit Modal ---
  const habitClose  = $('#habit-modal-close');
  const habitCancel = $('#habit-modal-cancel');
  const habitSave   = $('#habit-modal-save');
  const habitOverlay = $('#habit-modal-overlay');

  if (habitClose)   habitClose.addEventListener('click', () => closeModal('habit-modal-overlay'));
  if (habitCancel)  habitCancel.addEventListener('click', () => closeModal('habit-modal-overlay'));
  if (habitOverlay) habitOverlay.addEventListener('click', e => {
    if (e.target === habitOverlay) closeModal('habit-modal-overlay');
  });
  if (habitSave) habitSave.addEventListener('click', saveHabitFromModal);

  // --- Add Reward ---
  const addRewardBtn = $('#add-reward-btn');
  if (addRewardBtn) addRewardBtn.addEventListener('click', () => openModal('reward-modal-overlay'));

  // --- Reward Modal ---
  const rewardClose  = $('#reward-modal-close');
  const rewardCancel = $('#reward-modal-cancel');
  const rewardSave   = $('#reward-modal-save');
  const rewardOverlay = $('#reward-modal-overlay');

  if (rewardClose)   rewardClose.addEventListener('click', () => closeModal('reward-modal-overlay'));
  if (rewardCancel)  rewardCancel.addEventListener('click', () => closeModal('reward-modal-overlay'));
  if (rewardOverlay) rewardOverlay.addEventListener('click', e => {
    if (e.target === rewardOverlay) closeModal('reward-modal-overlay');
  });
  if (rewardSave) rewardSave.addEventListener('click', saveRewardFromModal);

  // --- Notification Toggle ---
  const notifyBtn = $('#notify-toggle');
  if (notifyBtn) notifyBtn.addEventListener('click', toggleNotifications);

  // --- Notes Modal ---
  const notesClose  = $('#notes-modal-close');
  const notesCancel = $('#notes-modal-cancel');
  const notesSave   = $('#notes-modal-save');
  const notesOverlay = $('#notes-modal-overlay');

  if (notesClose)   notesClose.addEventListener('click', () => closeModal('notes-modal-overlay'));
  if (notesCancel)  notesCancel.addEventListener('click', () => closeModal('notes-modal-overlay'));
  if (notesOverlay) notesOverlay.addEventListener('click', e => {
    if (e.target === notesOverlay) closeModal('notes-modal-overlay');
  });
  if (notesSave) notesSave.addEventListener('click', () => {
    const textarea = $('#notes-textarea');
    if (activeNoteDay !== null && textarea) {
      saveNote(activeNoteDay, textarea.value);
    }
    closeModal('notes-modal-overlay');
  });

  // --- Reward buy buttons (delegation) ---
  const rewardsGrid = $('#rewards-grid');
  if (rewardsGrid) {
    rewardsGrid.addEventListener('click', e => {
      const btn = e.target.closest('.buy-reward-btn');
      if (btn && !btn.disabled) {
        buyReward(btn.dataset.id);
      }
    });
  }

  // --- Difficulty selector in habit modal ---
  const diffSel = $('#difficulty-selector');
  if (diffSel) {
    diffSel.addEventListener('click', e => {
      const opt = e.target.closest('[data-difficulty]');
      if (!opt) return;
      diffSel.querySelectorAll('[data-difficulty]').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
    });
  }

  // --- Keyboard (Escape to close modals) ---
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  // --- Weekly Reflection Events ---
  const refBtn = $('#reflection-btn');
  if (refBtn) refBtn.addEventListener('click', () => openReflectionModal());

  const refClose = $('#reflection-modal-close');
  if (refClose) refClose.addEventListener('click', () => closeModal('reflection-modal-overlay'));

  const refCancel = $('#reflection-modal-cancel');
  if (refCancel) refCancel.addEventListener('click', () => closeModal('reflection-modal-overlay'));

  const refOverlay = $('#reflection-modal-overlay');
  if (refOverlay) refOverlay.addEventListener('click', e => {
    if (e.target === refOverlay) closeModal('reflection-modal-overlay');
  });

  const refSave = $('#reflection-modal-save');
  if (refSave) refSave.addEventListener('click', () => saveReflection());

  const moodSel = $('#mood-selector');
  if (moodSel) {
    moodSel.addEventListener('click', e => {
      const btn = e.target.closest('.mood-card-exec, .mood-card, .mood-btn');
      if (!btn) return;
      moodSel.querySelectorAll('.mood-card-exec, .mood-card, .mood-btn').forEach(b => {
        b.classList.remove('active', 'selected');
      });
      btn.classList.add('active', 'selected');
      moodSel.dataset.selectedMood = btn.dataset.mood;
    });
  }

  // --- Inline Motto Events ---
  const editMottoBtn = $('#edit-motto-btn');
  if (editMottoBtn) editMottoBtn.addEventListener('click', () => toggleInlineMottoEdit(true));

  const inlineCancel = $('#inline-motto-cancel');
  if (inlineCancel) inlineCancel.addEventListener('click', () => toggleInlineMottoEdit(false));

  const inlineSave = $('#inline-motto-save');
  if (inlineSave) inlineSave.addEventListener('click', () => saveInlineMotto());

  // --- Timer Events ---
  const tStart = $('#timer-start-btn');
  const tReset = $('#timer-reset-btn');
  if (tStart) tStart.addEventListener('click', toggleTimer);
  if (tReset) tReset.addEventListener('click', resetTimer);

  // --- Exam Scores Form ---
  const examForm = $('#exam-score-form');
  if (examForm) {
    examForm.addEventListener('submit', e => {
      e.preventDefault();
      const testName = $('#exam-name-input')?.value.trim();
      const score = parseFloat($('#exam-score-input')?.value) || 0;
      const accuracy = parseFloat($('#exam-accuracy-input')?.value) || 0;
      if (!testName) return;
      examScores.unshift({ testName, score, accuracy, date: new Date() });
      saveState();
      renderExamScores();
      $('#exam-name-input').value = '';
      $('#exam-score-input').value = '';
      $('#exam-accuracy-input').value = '';
    });
  }

  // --- Wishlist Form ---
  const wishForm = $('#wishlist-form');
  if (wishForm) {
    wishForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = $('#wishlist-title-input')?.value.trim();
      const targetAmount = parseInt($('#wishlist-target-input')?.value) || 50;
      if (!title) return;
      wishlistItems.unshift({ title, targetAmount, currentAmount: 0 });
      saveState();
      renderWishlistItems();
      $('#wishlist-title-input').value = '';
      $('#wishlist-target-input').value = '';
    });
  }

  // --- Window resize → redraw charts (debounced) ---
  window.addEventListener('resize', debounce(() => {
    drawAllCharts();
  }, 300));
}

/* ─────────────────────────────────────────────
   FEATURE PACK LOGIC (Timer, Exams, Wishlist, Leaderboard)
   ───────────────────────────────────────────── */

let timerSeconds = 25 * 60;
let timerInterval = null;
let isTimerRunning = false;

function toggleTimer() {
  const btn = $('#timer-start-btn');
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    if (btn) btn.textContent = 'Start';
  } else {
    isTimerRunning = true;
    if (btn) btn.textContent = 'Pause';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        if (btn) btn.textContent = 'Start';
        timerSeconds = 25 * 60;
        updateTimerDisplay();
        STATE.coins += 5;
        updateCoinDisplay();
        saveState();
        playSound('achievement');
        triggerConfetti();
        showToast('Focus Session Complete! You earned +5 coins!', '🎉');
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
  const btn = $('#timer-start-btn');
  if (btn) btn.textContent = 'Start';
}

function updateTimerDisplay() {
  const display = $('#timer-display');
  if (!display) return;
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderExamScores() {
  const container = $('#exam-scores-list');
  if (!container) return;
  if (!examScores || examScores.length === 0) {
    container.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">No mock scores logged yet.</span>';
    return;
  }
  container.innerHTML = examScores.map(s => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 6px 10px; border-radius: 6px;">
      <span style="font-weight: 600;">${s.testName}</span>
      <span style="color: var(--accent); font-weight: 700;">${s.score} pts <small style="color: var(--text-secondary);">(${s.accuracy}%)</small></span>
    </div>
  `).join('');
}

function renderWishlistItems() {
  const container = $('#wishlist-items-list');
  if (!container) return;
  if (!wishlistItems || wishlistItems.length === 0) {
    container.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">No wishlist items added yet.</span>';
    return;
  }
  container.innerHTML = wishlistItems.map(w => {
    const pct = Math.min(100, Math.round((STATE.coins / w.targetAmount) * 100));
    return `
      <div style="background: var(--bg-secondary); padding: 8px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
          <span style="font-weight: 600;">${w.title}</span>
          <span>🪙 ${STATE.coins}/${w.targetAmount} (${pct}%)</span>
        </div>
        <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444);"></div>
        </div>
      </div>
    `;
  }).join('');
}

async function fetchLeaderboard() {
  const container = $('#leaderboard-list');
  if (!container) return;
  try {
    const data = await apiGet('/api/leaderboard');
    if (data.leaderboard && data.leaderboard.length > 0) {
      container.innerHTML = data.leaderboard.map((u, i) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 8px 12px; border-radius: 8px;">
          <span><strong>#${i + 1}</strong> ${u.displayName || u.username}</span>
          <span style="font-weight: 700; color: #f59e0b;">🪙 ${u.coins || 0}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Leaderboard updating...</span>';
    }
  } catch (e) {
    container.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">Leaderboard unavailable offline</span>';
  }
}

function toggleNotifications() {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported by your browser.', '⚠️');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification('HabitFlow 📊', {
      body: 'Notifications are active! We will remind you to keep up your daily habits. 🔥',
      icon: '/manifest.json'
    });
    showToast('Notifications are active!', '🔔');
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('HabitFlow 📊', {
          body: 'Notifications enabled! Keep up your awesome habit streak! 🔥'
        });
        showToast('Notifications enabled!', '🔔');
      }
    });
  } else {
    showToast('Notification permissions were blocked in browser settings.', '⚠️');
  }
}

let selectedReflectionMood = '😊';

function openReflectionModal() {
  openModal('reflection-modal-overlay');
}

function saveReflection() {
  const moodSel = $('#mood-selector');
  const mood = moodSel?.dataset?.selectedMood || '😊';
  const status = $('#reflection-task-status')?.value || 'most';
  const notesText = $('#reflection-notes')?.value || '';

  // Award 10 coins for completing weekly reflection!
  STATE.coins += 10;
  updateCoinDisplay();
  saveState();
  playSound('achievement');
  triggerConfetti();

  closeModal('reflection-modal-overlay');
  showToast(`Reflection saved! You earned +10 coins!`, '🌟');
}

/* ------ Inline Motto Editor helpers ------ */

function toggleInlineMottoEdit(show) {
  const viewMode = $('#motto-view-mode');
  const editMode = $('#motto-edit-mode');
  const editBtn  = $('#edit-motto-btn');

  if (show) {
    const mottoInput = $('#inline-motto-input');
    const rulesInput = $('#inline-rules-input');
    if (mottoInput) mottoInput.value = STATE.motto || '';
    if (rulesInput) rulesInput.value = (STATE.rules || []).join('\n');
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = 'flex';
    if (editBtn) editBtn.style.display = 'none';
  } else {
    if (viewMode) viewMode.style.display = 'flex';
    if (editMode) editMode.style.display = 'none';
    if (editBtn) editBtn.style.display = 'inline-block';
  }
}

function saveInlineMotto() {
  const mottoInput = $('#inline-motto-input');
  const rulesInput = $('#inline-rules-input');
  if (mottoInput) STATE.motto = mottoInput.value.trim();
  if (rulesInput) {
    STATE.rules = rulesInput.value.split('\n').map(r => r.trim()).filter(Boolean);
  }
  saveState();
  updateMottoBanner();
  toggleInlineMottoEdit(false);
  showToast('Motto & Rules saved successfully!', '🦇');
}

/* ------ Habit Modal helpers ------ */

function openHabitModal(editIndex) {
  const title = $('#habit-modal-title');
  const nameInput = $('#habit-name-input');
  const goalInput = $('#habit-goal-input');
  const diffSel   = $('#difficulty-selector');

  if (typeof editIndex === 'number' && habits[editIndex]) {
    // Editing
    const h = habits[editIndex];
    if (title) title.textContent = 'Edit Habit';
    if (nameInput) nameInput.value = h.name;
    if (goalInput) goalInput.value = h.goal;
    setDifficulty(diffSel, h.difficulty);
  } else {
    // Adding
    if (title) title.textContent = 'Add New Habit';
    if (nameInput) nameInput.value = '';
    if (goalInput) goalInput.value = 25;
    setDifficulty(diffSel, 'easy');
  }

  openModal('habit-modal-overlay');
}

function setDifficulty(container, diff) {
  if (!container) return;
  container.querySelectorAll('[data-difficulty]').forEach(el => {
    el.classList.toggle('selected', el.dataset.difficulty === diff);
  });
}

function getSelectedDifficulty() {
  const sel = document.querySelector('#difficulty-selector [data-difficulty].selected');
  return sel ? sel.dataset.difficulty : 'easy';
}

function saveHabitFromModal() {
  const name = ($('#habit-name-input')?.value || '').trim();
  const goal = parseInt($('#habit-goal-input')?.value) || 25;
  const diff = getSelectedDifficulty();

  if (!name) {
    showToast('Please enter a habit name.', '⚠️');
    return;
  }

  if (editingHabitIndex !== null && habits[editingHabitIndex]) {
    // Update existing
    habits[editingHabitIndex].name = name;
    habits[editingHabitIndex].goal = goal;
    habits[editingHabitIndex].difficulty = diff;
  } else {
    // Add new
    habits.push({
      id: generateId(),
      name,
      goal,
      difficulty: diff,
      checks: {},
    });
  }

  editingHabitIndex = null;
  closeModal('habit-modal-overlay');
  showToast('Habit saved successfully!', '✨');
  saveState();
  refreshAll();
}

function saveRewardFromModal() {
  const name  = ($('#reward-name-input')?.value || '').trim();
  const cost  = parseInt($('#reward-cost-input')?.value) || 10;
  const emoji = ($('#reward-emoji-input')?.value || '').trim() || '🎁';

  if (!name) {
    showToast('Please enter a reward name.', '⚠️');
    return;
  }

  addReward(name, cost, emoji);
  closeModal('reward-modal-overlay');

  // Clear inputs
  const nameInput = $('#reward-name-input');
  const costInput = $('#reward-cost-input');
  const emojiInput = $('#reward-emoji-input');
  if (nameInput) nameInput.value = '';
  if (costInput) costInput.value = 50;
  if (emojiInput) emojiInput.value = '';
}

/* ------ Month/Year change ------ */

async function onMonthYearChange() {
  await apiPost('/api/save', {
    month: STATE.currentMonth,
    year: STATE.currentYear,
    habits,
    notes,
    settings: { coins: STATE.coins, darkMode: STATE.darkMode, soundEnabled: STATE.soundEnabled, achievements },
    rewards,
  });

  const monthSel = $('#month-select');
  const yearSel = $('#year-select');
  if (monthSel) STATE.currentMonth = parseInt(monthSel.value);
  if (yearSel) STATE.currentYear = parseInt(yearSel.value);

  updateMonthDisplay();

  try {
    const data = await apiGet(`/api/data?month=${STATE.currentMonth}&year=${STATE.currentYear}`);
    if (data.habits && Array.isArray(data.habits) && data.habits.length > 0) {
      habits = data.habits;
    } else {
      habits = DEFAULT_HABITS.map(h => ({
        id: generateId(),
        name: h.name,
        goal: h.goal,
        difficulty: h.difficulty,
        checks: {},
      }));
    }
    notes = data.notes || {};
  } catch (err) {
    habits = DEFAULT_HABITS.map(h => ({
      id: generateId(),
      name: h.name, goal: h.goal, difficulty: h.difficulty, checks: {},
    }));
    notes = {};
  }

  STATE.activeWeekTab = 0;
  refreshAll();
}

function refreshAll() {
  buildGrid();
  buildWeekTabs();
  drawAllCharts();
  updateProgressTable();
  updateTopHabits();
  updateDailyStats();
  calculateStreaks();
  updateStreaksDisplay();
  checkAchievements();
  updateAchievementsDisplay();
  updateRewardShop();
  updateCoinDisplay();
  buildHeatmap();
  calculatePrediction();
  updateSummaryStatBar();
}

const MOTIVATIONAL_QUOTES = [
  '"Consistency is what transforms average into excellence."',
  '"Every dog has a day. Work until yours arrives!"',
  '"Small daily improvements over time lead to stunning results."',
  '"Discipline is choosing between what you want now and what you want most."',
  '"Don\'t stop until you\'re proud."'
];

function updateSummaryStatBar() {
  const todayProgressEl = $('#summary-today-progress');
  const currentStreakEl = $('#summary-current-streak');
  const completionPctEl = $('#summary-completion-pct');
  const quoteEl = $('#summary-daily-quote');

  const todayIndex = new Date().getDate() - 1;
  let doneToday = 0;
  let totalHabits = habits ? habits.length : 0;

  if (habits) {
    habits.forEach(h => {
      if (h.checks && h.checks[todayIndex]) doneToday++;
    });
  }

  if (todayProgressEl) todayProgressEl.textContent = `${doneToday} / ${totalHabits} Done`;

  let maxStreak = 0;
  if (typeof calculateStreaks === 'function') {
    const streaksData = calculateStreaks();
    if (Array.isArray(streaksData)) {
      streaksData.forEach(s => {
        if (s.currentStreak > maxStreak) maxStreak = s.currentStreak;
      });
    }
  }
  if (currentStreakEl) currentStreakEl.textContent = `${maxStreak} Days`;

  let totalPossible = 0;
  let totalChecked = 0;
  const daysInMonth = getDaysInMonth(STATE.currentMonth, STATE.currentYear);
  if (habits) {
    habits.forEach(h => {
      totalPossible += daysInMonth;
      if (h.checks) {
        Object.keys(h.checks).forEach(k => {
          if (h.checks[k]) totalChecked++;
        });
      }
    });
  }
  const overallPct = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;
  if (completionPctEl) completionPctEl.textContent = `${overallPct}%`;

  if (quoteEl) {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    quoteEl.textContent = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
  }
}

/* ─────────────────────────────────────────────
   END OF app.js
   ───────────────────────────────────────────── */
