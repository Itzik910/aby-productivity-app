const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekdays', 'weekends', 'weekly', 'custom'],
    default: 'daily',
  },
  // Used when frequency === 'custom': 0=Sun, 1=Mon, ... 6=Sat
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
  }],
  // Preferred reminder time e.g. "07:30"
  preferredTime: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    enum: ['health', 'learning', 'work', 'personal', 'social', 'finance', 'other'],
    default: 'personal',
  },
  color: {
    type: String,
    default: '#7c3aed',
  },
  emoji: {
    type: String,
    default: '⭐',
  },
  // Array of dates completed (ISO date strings YYYY-MM-DD)
  completedDates: [{
    type: String,
  }],
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  totalCompletions: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

habitSchema.index({ user: 1, isActive: 1 });

// Calculate streaks
habitSchema.methods.recalculateStreaks = function() {
  const sortedDates = [...new Set(this.completedDates)].sort();
  if (sortedDates.length === 0) {
    this.currentStreak = 0;
    this.longestStreak = 0;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  // Check if last completion was today or yesterday (streak not broken)
  const isActive = lastDate === today || lastDate === yesterday;
  let currentStreak = isActive ? 1 : 0;
  let longestStreak = 1;
  let maxRun = 1;

  for (let i = sortedDates.length - 2; i >= 0; i--) {
    const d1 = new Date(sortedDates[i + 1]);
    const d2 = new Date(sortedDates[i]);
    const diff = Math.round((d1 - d2) / 86400000);

    if (diff === 1) {
      maxRun++;
      if (isActive && i === sortedDates.length - 2) currentStreak++;
    } else {
      if (maxRun > longestStreak) longestStreak = maxRun;
      maxRun = 1;
      if (isActive && diff > 1) isActive; // break current streak calc
    }
  }

  this.currentStreak = currentStreak;
  this.longestStreak = Math.max(longestStreak, maxRun, currentStreak);
  this.totalCompletions = sortedDates.length;
};

module.exports = mongoose.model('Habit', habitSchema);
