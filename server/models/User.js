const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  avatar: {
    type: String,
    default: null
  },
  
  // Profile Information
  age: {
    type: Number,
    min: [13, 'Age must be at least 13'],
    max: [120, 'Age cannot exceed 120']
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    }
  },
  profession: {
    type: String,
    enum: ['student', 'parent', 'freelancer', 'employee', 'entrepreneur', 'retired', 'other'],
    default: 'other'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'daily'
      }
    },
    privacy: {
      shareProgress: { type: Boolean, default: false },
      shareLocation: { type: Boolean, default: false },
      shareAchievements: { type: Boolean, default: true }
    }
  },
  
  // Subscription & Billing
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false }
  },
  
  // Statistics & Progress
  stats: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    joinDate: { type: Date, default: Date.now }
  },
  
  // AI Usage Tracking
  aiUsage: {
    totalRequests: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    lastRequestDate: Date,
    monthlyRequests: { type: Number, default: 0 },
    monthlyTokens: { type: Number, default: 0 }
  },
  
  // Achievements & Badges
  achievements: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now },
    points: { type: Number, default: 0 }
  }],
  
  // Account Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  
  // Social Features
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Device Management
  devices: [{
    deviceId: String,
    deviceName: String,
    lastActive: Date,
    isActive: { type: Boolean, default: true }
  }]
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ 'stats.totalPoints': -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    name: this.name,
    avatar: this.avatar,
    profession: this.profession,
    stats: this.stats,
    achievements: this.achievements,
    isActive: this.isActive
  };
};

// Static method to find users by location
userSchema.statics.findNearby = function(coordinates, maxDistance = 10000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: maxDistance
      }
    },
    'preferences.privacy.shareLocation': true,
    isActive: true
  });
};

module.exports = mongoose.model('User', userSchema); 