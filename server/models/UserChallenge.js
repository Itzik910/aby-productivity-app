const mongoose = require('mongoose');

const userChallengeSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Challenge Type
  type: {
    type: String,
    enum: ['habit', 'goal', 'skill', 'fitness', 'learning', 'custom'],
    default: 'goal'
  },
  category: {
    type: String,
    enum: ['health', 'fitness', 'learning', 'career', 'personal', 'social', 'financial', 'other'],
    default: 'personal'
  },
  
  // Duration and Timing
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in days
    required: true
  },
  
  // Progress Tracking
  target: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true,
      default: 'times'
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'total'],
      default: 'total'
    }
  },
  
  // Current Progress
  progress: {
    current: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    checkIns: [{
      date: {
        type: Date,
        default: Date.now
      },
      value: Number,
      notes: String
    }]
  },
  
  // Milestones
  milestones: [{
    title: String,
    target: Number,
    reached: {
      type: Boolean,
      default: false
    },
    reachedAt: Date
  }],
  
  // Rewards and Motivation
  rewards: {
    points: {
      type: Number,
      default: 100
    },
    customReward: String
  },
  motivationalQuotes: [String],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'failed', 'abandoned'],
    default: 'active'
  },
  
  // Reminders
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily'
    },
    time: String, // e.g., "09:00"
    daysOfWeek: [Number] // 0-6 for Sunday-Saturday
  },
  
  // Analytics
  analytics: {
    streakCurrent: {
      type: Number,
      default: 0
    },
    streakBest: {
      type: Number,
      default: 0
    },
    totalCheckIns: {
      type: Number,
      default: 0
    },
    averageProgress: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    }
  },
  
  // Visibility
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // Associated Tasks
  linkedTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }]
}, {
  timestamps: true
});

// Indexes
userChallengeSchema.index({ user: 1, status: 1 });
userChallengeSchema.index({ user: 1, startDate: 1 });
userChallengeSchema.index({ endDate: 1 });

// Virtual for days remaining
userChallengeSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for is overdue
userChallengeSchema.virtual('isOverdue').get(function() {
  return this.status === 'active' && new Date() > this.endDate;
});

// Method to update progress
userChallengeSchema.methods.updateProgress = function(value, notes = '') {
  this.progress.current += value;
  this.progress.percentage = Math.min(100, Math.round((this.progress.current / this.target.value) * 100));
  this.progress.lastUpdated = new Date();
  
  this.progress.checkIns.push({
    date: new Date(),
    value,
    notes
  });
  
  // Update analytics
  this.analytics.totalCheckIns++;
  
  // Check milestones
  this.milestones.forEach(milestone => {
    if (!milestone.reached && this.progress.current >= milestone.target) {
      milestone.reached = true;
      milestone.reachedAt = new Date();
    }
  });
  
  // Check if completed
  if (this.progress.percentage >= 100) {
    this.status = 'completed';
  }
  
  return this.save();
};

// Method to calculate streak
userChallengeSchema.methods.calculateStreak = function() {
  if (this.progress.checkIns.length === 0) {
    this.analytics.streakCurrent = 0;
    return;
  }
  
  const sortedCheckIns = this.progress.checkIns
    .sort((a, b) => b.date - a.date);
  
  let currentStreak = 0;
  let lastDate = null;
  
  for (const checkIn of sortedCheckIns) {
    const checkInDate = new Date(checkIn.date);
    checkInDate.setHours(0, 0, 0, 0);
    
    if (!lastDate) {
      currentStreak = 1;
      lastDate = checkInDate;
    } else {
      const dayDiff = (lastDate - checkInDate) / (1000 * 60 * 60 * 24);
      
      if (dayDiff === 1) {
        currentStreak++;
        lastDate = checkInDate;
      } else {
        break;
      }
    }
  }
  
  this.analytics.streakCurrent = currentStreak;
  this.analytics.streakBest = Math.max(this.analytics.streakBest, currentStreak);
};

// Pre-save middleware
userChallengeSchema.pre('save', function(next) {
  // Calculate duration if not set
  if (!this.duration && this.startDate && this.endDate) {
    const diff = this.endDate - this.startDate;
    this.duration = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  // Calculate streak
  this.calculateStreak();
  
  next();
});

module.exports = mongoose.model('UserChallenge', userChallengeSchema); 