const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  // Basic Challenge Information
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters']
  },
  
  // Sponsor Information
  sponsor: {
    name: {
      type: String,
      required: [true, 'Sponsor name is required'],
      trim: true
    },
    logo: String,
    website: String,
    description: String,
    contactEmail: String
  },
  
  // Challenge Details
  category: {
    type: String,
    enum: ['productivity', 'health', 'learning', 'creativity', 'fitness', 'mindfulness', 'social', 'environmental', 'professional'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'beginner'
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'one-time', 'ongoing'],
    default: 'weekly'
  },
  
  // Timing
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  duration: {
    type: Number, // in days
    required: true
  },
  
  // Participation
  maxParticipants: {
    type: Number,
    default: null // null means unlimited
  },
  minParticipants: {
    type: Number,
    default: 1
  },
  currentParticipants: {
    type: Number,
    default: 0
  },
  
  // Challenge Structure
  tasks: [{
    title: {
      type: String,
      required: true,
      maxlength: [100, 'Task title cannot exceed 100 characters']
    },
    description: {
      type: String,
      maxlength: [500, 'Task description cannot exceed 500 characters']
    },
    points: {
      type: Number,
      default: 10,
      min: 1
    },
    isRequired: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      required: true
    },
    dueDate: Date,
    estimatedDuration: Number, // in minutes
    category: String,
    resources: [{
      title: String,
      url: String,
      type: {
        type: String,
        enum: ['video', 'article', 'tool', 'template', 'guide'],
        default: 'article'
      }
    }]
  }],
  
  // Rewards and Points
  rewards: {
    points: {
      completion: {
        type: Number,
        default: 100
      },
      participation: {
        type: Number,
        default: 50
      },
      daily: {
        type: Number,
        default: 10
      },
      bonus: {
        type: Number,
        default: 25
      }
    },
    prizes: [{
      rank: Number, // 1st, 2nd, 3rd place
      title: String,
      description: String,
      value: String,
      type: {
        type: String,
        enum: ['physical', 'digital', 'discount', 'experience', 'subscription'],
        default: 'digital'
      },
      imageUrl: String,
      claimInstructions: String
    }],
    badges: [{
      name: String,
      description: String,
      imageUrl: String,
      criteria: String,
      points: Number
    }],
    achievements: [{
      name: String,
      description: String,
      icon: String,
      unlockedBy: String // criteria to unlock
    }]
  },
  
  // Participation Tracking
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped', 'paused'],
      default: 'active'
    },
    progress: {
      tasksCompleted: {
        type: Number,
        default: 0
      },
      totalTasks: {
        type: Number,
        default: 0
      },
      pointsEarned: {
        type: Number,
        default: 0
      },
      completionRate: {
        type: Number,
        default: 0
      },
      rank: Number,
      badges: [{
        badgeId: String,
        earnedAt: Date
      }],
      achievements: [{
        achievementId: String,
        unlockedAt: Date
      }]
    },
    completedTasks: [{
      taskId: String,
      completedAt: Date,
      pointsEarned: Number,
      notes: String
    }],
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      submittedAt: Date
    }
  }],
  
  // Challenge Media
  media: {
    banner: String,
    thumbnail: String,
    gallery: [String],
    video: {
      url: String,
      thumbnail: String,
      duration: Number
    }
  },
  
  // Social Features
  social: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowSharing: {
      type: Boolean,
      default: true
    },
    showLeaderboard: {
      type: Boolean,
      default: true
    },
    enableTeams: {
      type: Boolean,
      default: false
    }
  },
  
  // Analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    joinRate: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0
    }
  },
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'cancelled', 'archived'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Notifications
  notifications: {
    reminderEnabled: {
      type: Boolean,
      default: true
    },
    updateEnabled: {
      type: Boolean,
      default: true
    },
    completionEnabled: {
      type: Boolean,
      default: true
    }
  },
  
  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // SEO and Marketing
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  
  // Rules and Guidelines
  rules: [String],
  guidelines: String,
  terms: String,
  
  // Localization
  language: {
    type: String,
    default: 'en'
  },
  translations: [{
    language: String,
    title: String,
    description: String,
    shortDescription: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
challengeSchema.index({ status: 1, startDate: 1 });
challengeSchema.index({ category: 1, difficulty: 1 });
challengeSchema.index({ 'sponsor.name': 1 });
challengeSchema.index({ isFeatured: 1, isPublic: 1 });
challengeSchema.index({ 'seo.slug': 1 });

// Virtual for active status
challengeSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now;
});

// Virtual for registration status
challengeSchema.virtual('canRegister').get(function() {
  const now = new Date();
  return this.status === 'published' && 
         this.startDate > now && 
         (!this.maxParticipants || this.currentParticipants < this.maxParticipants);
});

// Virtual for completion rate
challengeSchema.virtual('overallCompletionRate').get(function() {
  if (this.participants.length === 0) return 0;
  const completedParticipants = this.participants.filter(p => p.status === 'completed').length;
  return Math.round((completedParticipants / this.participants.length) * 100);
});

// Pre-save middleware
challengeSchema.pre('save', function(next) {
  // Generate slug from title if not provided
  if (!this.seo.slug && this.title) {
    this.seo.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Update current participants count
  this.currentParticipants = this.participants.filter(p => p.status === 'active').length;
  
  // Calculate analytics
  this.analytics.completionRate = this.overallCompletionRate;
  
  next();
});

// Instance method to add participant
challengeSchema.methods.addParticipant = function(userId) {
  if (this.maxParticipants && this.currentParticipants >= this.maxParticipants) {
    throw new Error('Challenge is full');
  }
  
  if (this.participants.find(p => p.user.toString() === userId.toString())) {
    throw new Error('User already participating');
  }
  
  this.participants.push({
    user: userId,
    progress: {
      totalTasks: this.tasks.length
    }
  });
  
  return this.save();
};

// Instance method to update participant progress
challengeSchema.methods.updateParticipantProgress = function(userId, taskId, pointsEarned) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) {
    throw new Error('Participant not found');
  }
  
  // Add completed task
  participant.completedTasks.push({
    taskId,
    completedAt: new Date(),
    pointsEarned
  });
  
  // Update progress
  participant.progress.tasksCompleted += 1;
  participant.progress.pointsEarned += pointsEarned;
  participant.progress.completionRate = Math.round(
    (participant.progress.tasksCompleted / participant.progress.totalTasks) * 100
  );
  
  // Check if challenge is completed
  if (participant.progress.tasksCompleted >= participant.progress.totalTasks) {
    participant.status = 'completed';
    participant.progress.pointsEarned += this.rewards.points.completion;
  }
  
  return this.save();
};

// Static method to find active challenges
challengeSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    isPublic: true
  });
};

// Static method to find featured challenges
challengeSchema.statics.findFeatured = function() {
  return this.find({
    isFeatured: true,
    isPublic: true,
    status: { $in: ['published', 'active'] }
  }).sort({ createdAt: -1 });
};

// Static method to find by category
challengeSchema.statics.findByCategory = function(category) {
  return this.find({
    category,
    isPublic: true,
    status: { $in: ['published', 'active'] }
  });
};

module.exports = mongoose.model('Challenge', challengeSchema); 