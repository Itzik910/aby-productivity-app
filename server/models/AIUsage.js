const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Request Details
  requestType: {
    type: String,
    enum: ['task_suggestion', 'completion_help', 'optimization', 'location_based', 'mood_analysis', 'productivity_insight'],
    required: true
  },
  
  // Input Context
  input: {
    taskTitle: String,
    taskDescription: String,
    userContext: {
      location: {
        coordinates: [Number],
        city: String,
        country: String
      },
      timeOfDay: String,
      weather: String,
      mood: String,
      energy: String,
      profession: String,
      recentTasks: [String]
    },
    userPreferences: {
      theme: String,
      language: String,
      notificationFrequency: String
    }
  },
  
  // AI Response
  response: {
    suggestions: [{
      text: String,
      type: {
        type: String,
        enum: ['completion', 'optimization', 'location', 'timing', 'collaboration', 'diy', 'service'],
        required: true
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      },
      reasoning: String
    }],
    stepByStepBreakdown: [{
      step: String,
      estimatedTime: Number,
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
      }
    }],
    motivationalMessage: String,
    relatedTasks: [String]
  },
  
  // Usage Metrics
  tokens: {
    input: {
      type: Number,
      required: true
    },
    output: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    }
  },
  
  // User Interaction
  userAction: {
    type: String,
    enum: ['ignored', 'viewed', 'clicked', 'executed', 'dismissed'],
    default: 'ignored'
  },
  
  selectedSuggestion: {
    index: Number,
    text: String,
    executedAt: Date
  },
  
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    helpful: {
      type: Boolean
    },
    comments: String,
    submittedAt: Date
  },
  
  // Performance Metrics
  performance: {
    responseTime: {
      type: Number, // in milliseconds
      required: true
    },
    errorOccurred: {
      type: Boolean,
      default: false
    },
    errorMessage: String
  },
  
  // Context for Learning
  context: {
    userLevel: Number,
    userStreak: Number,
    totalTasksCompleted: Number,
    averageTaskCompletionTime: Number,
    preferredCategories: [String],
    activeChallenges: [String]
  },
  
  // Model Information
  model: {
    name: {
      type: String,
      default: 'gpt-4'
    },
    version: String,
    temperature: {
      type: Number,
      default: 0.7
    },
    maxTokens: {
      type: Number,
      default: 1000
    }
  },
  
  // Cost Tracking
  cost: {
    inputCost: {
      type: Number,
      default: 0
    },
    outputCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  }
}, {
  timestamps: true
});

// Indexes for performance and analytics
aiUsageSchema.index({ user: 1, createdAt: -1 });
aiUsageSchema.index({ requestType: 1, createdAt: -1 });
aiUsageSchema.index({ 'userAction': 1, createdAt: -1 });
aiUsageSchema.index({ 'feedback.helpful': 1, createdAt: -1 });

// Virtual for total cost
aiUsageSchema.virtual('totalCostUSD').get(function() {
  return this.cost.totalCost;
});

// Instance method to mark as executed
aiUsageSchema.methods.markExecuted = function(suggestionIndex) {
  this.userAction = 'executed';
  this.selectedSuggestion = {
    index: suggestionIndex,
    text: this.response.suggestions[suggestionIndex]?.text,
    executedAt: new Date()
  };
  return this.save();
};

// Instance method to add feedback
aiUsageSchema.methods.addFeedback = function(feedbackData) {
  this.feedback = {
    ...feedbackData,
    submittedAt: new Date()
  };
  return this.save();
};

// Static method to get user AI usage statistics
aiUsageSchema.statics.getUserStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokens.total' },
        totalCost: { $sum: '$cost.totalCost' },
        executedRequests: {
          $sum: {
            $cond: [{ $eq: ['$userAction', 'executed'] }, 1, 0]
          }
        },
        helpfulFeedback: {
          $sum: {
            $cond: [{ $eq: ['$feedback.helpful', true] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Static method to get popular request types
aiUsageSchema.statics.getPopularRequestTypes = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$requestType',
        count: { $sum: 1 },
        avgTokens: { $avg: '$tokens.total' },
        avgCost: { $avg: '$cost.totalCost' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get feedback insights
aiUsageSchema.statics.getFeedbackInsights = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        'feedback.helpful': { $exists: true }
      }
    },
    {
      $group: {
        _id: '$requestType',
        totalFeedback: { $sum: 1 },
        helpfulCount: {
          $sum: {
            $cond: [{ $eq: ['$feedback.helpful', true] }, 1, 0]
          }
        },
        avgRating: { $avg: '$feedback.rating' }
      }
    },
    {
      $addFields: {
        helpfulPercentage: {
          $multiply: [
            { $divide: ['$helpfulCount', '$totalFeedback'] },
            100
          ]
        }
      }
    },
    {
      $sort: { helpfulPercentage: -1 }
    }
  ]);
};

module.exports = mongoose.model('AIUsage', aiUsageSchema); 