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
  
  // Premium Profile Information (required for premium upgrade)
  premiumDetails: {
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return /^\+?[\d\s\-\(\)]+$/.test(v);
        },
        message: 'Please enter a valid phone number'
      }
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function(v) {
          if (!v) return true;
          const age = Math.floor((Date.now() - v.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          return age >= 13 && age <= 120;
        },
        message: 'Age must be between 13 and 120 years'
      }
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String
    },
    interests: [{
      type: String,
      enum: ['productivity', 'health', 'education', 'business', 'technology', 'creativity', 'fitness', 'travel', 'cooking', 'reading', 'music', 'sports', 'art', 'science', 'finance', 'other']
    }],
    goals: [{
      type: String,
      enum: ['career_advancement', 'skill_development', 'health_improvement', 'financial_stability', 'personal_growth', 'relationship_building', 'work_life_balance', 'learning_new_language', 'starting_business', 'fitness_goals', 'other']
    }],
    workSchedule: {
      type: String,
      enum: ['9to5', 'flexible', 'shift_work', 'remote', 'part_time', 'freelance', 'student', 'unemployed', 'other']
    },
    stressLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very_high']
    },
    sleepPattern: {
      type: String,
      enum: ['early_bird', 'night_owl', 'regular', 'irregular']
    },
    dietaryRestrictions: [String],
    accessibilityNeeds: [String],
    preferredCommunication: {
      type: String,
      enum: ['email', 'sms', 'push_notifications', 'in_app', 'phone']
    }
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
  
  // Premium Status (replaces Stripe subscription)
  premium: {
    isPremium: { type: Boolean, default: false },
    upgradeDate: Date,
    upgradeMethod: {
      type: String,
      enum: ['profile_completion', 'admin_granted', 'promotional'],
      default: 'profile_completion'
    },
    premiumFeatures: [{
      type: String,
      enum: ['advanced_ai', 'unlimited_tasks', 'priority_support', 'custom_themes', 'data_export', 'team_features', 'advanced_analytics', 'api_access']
    }],
    premiumUntil: Date, // For temporary premium access
    isLifetime: { type: Boolean, default: false }
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
  isAdmin: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Deactivation tracking
  deactivatedAt: Date,
  deactivationReason: {
    type: String,
    enum: ['user_request', 'inactivity', 'violation', 'admin_action']
  },
  
  // Push Notifications
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  },
  
  // Security & Activity
  lastLoginAt: { type: Date, default: Date.now },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  twoFactorSecret: String,
  twoFactorEnabled: { type: Boolean, default: false },
  
  // Device Management
  devices: [{
    deviceId: String,
    deviceType: String, // 'mobile', 'desktop', 'tablet'
    userAgent: String,
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // API Access
  apiKey: String,
  apiKeyCreatedAt: Date,
  apiUsage: {
    requests: { type: Number, default: 0 },
    lastRequest: Date
  },
  
  // Social Features
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Collaboration
  teams: [{
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    role: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  
  // File uploads
  uploadedFiles: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'premium.isPremium': 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ lastLoginAt: 1 });
userSchema.index({ 'pushSubscription.endpoint': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

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
    isActive: this.isActive,
    premium: {
      isPremium: this.premium.isPremium,
      premiumFeatures: this.premium.premiumFeatures
    }
  };
};

// Instance method to check if user can upgrade to premium
userSchema.methods.canUpgradeToPremium = function() {
  const requiredFields = (process.env.PREMIUM_REQUIRED_FIELDS || 'phoneNumber,dateOfBirth,address,interests,goals,workSchedule,stressLevel,sleepPattern').split(',');
  
  return requiredFields.every(field => {
    const fieldPath = `premiumDetails.${field}`;
    const value = fieldPath.split('.').reduce((obj, key) => obj && obj[key], this);
    return value && (Array.isArray(value) ? value.length > 0 : true);
  });
};

// Instance method to upgrade to premium
userSchema.methods.upgradeToPremium = function() {
  if (!this.canUpgradeToPremium()) {
    throw new Error('Cannot upgrade to premium: missing required profile details');
  }
  
  this.premium.isPremium = true;
  this.premium.upgradeDate = new Date();
  this.premium.upgradeMethod = process.env.PREMIUM_UPGRADE_METHOD || 'profile_completion';
  this.premium.premiumFeatures = [
    'advanced_ai',
    'unlimited_tasks', 
    'priority_support',
    'custom_themes',
    'data_export',
    'advanced_analytics'
  ];
  
  return this.save();
};

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

module.exports = mongoose.model('User', userSchema); 