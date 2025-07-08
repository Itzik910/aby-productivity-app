const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // Basic Task Information
  title: {
    type: String,
    required: [true, 'Task title is required'],
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
  
  // Task Details
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'learning', 'social', 'finance', 'home', 'other'],
    default: 'personal'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'archived'],
    default: 'pending'
  },
  
  // Time Management
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  startDate: Date,
  completedAt: Date,
  estimatedDuration: {
    type: Number, // in minutes
    min: 1
  },
  actualDuration: {
    type: Number, // in minutes
    min: 0
  },
  
  // Recurrence
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrence: {
    pattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'daily'
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    },
    endDate: Date,
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6
    }],
    dayOfMonth: Number,
    monthOfYear: Number
  },
  
  // Location & Context
  location: {
    name: String,
    address: String,
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
    },
    radius: {
      type: Number, // in meters
      default: 100
    }
  },
  context: {
    weather: String,
    timeOfDay: String,
    mood: String,
    energy: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  
  // AI Integration
  aiSuggestions: [{
    suggestion: String,
    type: {
      type: String,
      enum: ['completion', 'optimization', 'location', 'timing', 'collaboration'],
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    selectedAt: Date,
    feedback: {
      type: String,
      enum: ['helpful', 'not_helpful', 'neutral'],
      default: 'neutral'
    }
  }],
  
  // Steps & Subtasks
  steps: [{
    title: {
      type: String,
      required: true,
      maxlength: [100, 'Step title cannot exceed 100 characters']
    },
    description: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    order: {
      type: Number,
      required: true
    }
  }],
  
  // Attachments & Resources
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tags & Labels
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  
  // Collaboration
  collaborators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date
  }],
  
  // Sponsorship & Challenges
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  },
  sponsorPoints: {
    type: Number,
    default: 0
  },
  
  // Progress Tracking
  progress: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    checkIns: [{
      timestamp: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['started', 'in_progress', 'completed', 'paused'],
        required: true
      },
      notes: String,
      mood: {
        type: String,
        enum: ['great', 'good', 'okay', 'bad', 'terrible'],
        default: 'okay'
      }
    }]
  },
  
  // Notifications
  reminders: [{
    type: {
      type: String,
      enum: ['push', 'email', 'sms'],
      required: true
    },
    time: {
      type: Date,
      required: true
    },
    message: String,
    isSent: {
      type: Boolean,
      default: false
    },
    sentAt: Date
  }],
  
  // Analytics
  analytics: {
    timeSpent: {
      type: Number, // in minutes
      default: 0
    },
    interruptions: {
      type: Number,
      default: 0
    },
    focusScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    completionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Offline Sync
  sync: {
    lastModified: {
      type: Date,
      default: Date.now
    },
    isSynced: {
      type: Boolean,
      default: true
    },
    deviceId: String,
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, category: 1 });
taskSchema.index({ 'location.coordinates': '2dsphere' });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ isRecurring: 1, 'recurrence.endDate': 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.dueDate < new Date();
});

// Virtual for completion percentage
taskSchema.virtual('completionPercentage').get(function() {
  if (this.steps.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }
  const completedSteps = this.steps.filter(step => step.isCompleted).length;
  return Math.round((completedSteps / this.steps.length) * 100);
});

// Pre-save middleware to update progress
taskSchema.pre('save', function(next) {
  if (this.steps.length > 0) {
    this.progress.percentage = this.completionPercentage;
  }
  next();
});

// Instance method to add step
taskSchema.methods.addStep = function(stepData) {
  const order = this.steps.length + 1;
  this.steps.push({ ...stepData, order });
  return this.save();
};

// Instance method to complete step
taskSchema.methods.completeStep = function(stepIndex) {
  if (this.steps[stepIndex]) {
    this.steps[stepIndex].isCompleted = true;
    this.steps[stepIndex].completedAt = new Date();
    return this.save();
  }
  throw new Error('Step not found');
};

// Instance method to add AI suggestion
taskSchema.methods.addAISuggestion = function(suggestion) {
  this.aiSuggestions.push(suggestion);
  return this.save();
};

// Static method to find tasks by location
taskSchema.statics.findNearby = function(coordinates, maxDistance = 5000) {
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
    status: { $in: ['pending', 'in_progress'] }
  });
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function(userId) {
  return this.find({
    user: userId,
    status: 'pending',
    dueDate: { $lt: new Date() }
  });
};

module.exports = mongoose.model('Task', taskSchema); 