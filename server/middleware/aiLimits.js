const User = require('../models/User');
const AIUsage = require('../models/AIUsage');

// Get AI limits from environment variables
const FREE_TIER_LIMIT = parseInt(process.env.FREE_TIER_MONTHLY_AI_LIMIT) || 50;
const PREMIUM_TIER_LIMIT = parseInt(process.env.PREMIUM_TIER_MONTHLY_AI_LIMIT) || 1000;

// Check AI usage limits
const checkAIUsageLimit = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get current month's usage
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyUsage = await AIUsage.aggregate([
      {
        $match: {
          userId: user._id,
          timestamp: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' }
        }
      }
    ]);

    const usage = monthlyUsage[0] || { totalRequests: 0, totalTokens: 0 };
    
    // Determine user's limit based on premium status
    const userLimit = user.premium.isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT;
    
    // Check if user has exceeded their limit
    if (usage.totalRequests >= userLimit) {
      return res.status(429).json({
        success: false,
        message: `AI usage limit exceeded. ${user.premium.isPremium ? 'Premium' : 'Free'} tier allows ${userLimit} requests per month.`,
        data: {
          currentUsage: usage.totalRequests,
          limit: userLimit,
          resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          upgradeAvailable: !user.premium.isPremium
        }
      });
    }

    // Add usage info to request for logging
    req.aiUsageInfo = {
      currentUsage: usage.totalRequests,
      limit: userLimit,
      remaining: userLimit - usage.totalRequests,
      isPremium: user.premium.isPremium
    };

    next();
  } catch (error) {
    console.error('Error checking AI usage limit:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking AI usage limits'
    });
  }
};

// Log AI usage after successful request
const logAIUsage = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to log usage after response
  res.json = function(data) {
    // Call original json method
    originalJson.call(this, data);
    
    // Log usage if request was successful
    if (data.success && req.user && req.aiTokensUsed) {
      logAIUsageAsync(req.user.id, req.route.path, req.aiTokensUsed);
    }
  };
  
  next();
};

// Async function to log AI usage
const logAIUsageAsync = async (userId, feature, tokensUsed = 0) => {
  try {
    await AIUsage.create({
      userId,
      feature,
      tokensUsed,
      timestamp: new Date()
    });

    // Update user's AI usage stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'aiUsage.totalRequests': 1,
        'aiUsage.tokensUsed': tokensUsed,
        'aiUsage.monthlyRequests': 1,
        'aiUsage.monthlyTokens': tokensUsed
      },
      $set: {
        'aiUsage.lastRequestDate': new Date()
      }
    });
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
};

// Reset monthly usage counters (to be called by a cron job)
const resetMonthlyUsage = async () => {
  try {
    await User.updateMany({}, {
      $set: {
        'aiUsage.monthlyRequests': 0,
        'aiUsage.monthlyTokens': 0
      }
    });
    
    console.log('Monthly AI usage counters reset successfully');
  } catch (error) {
    console.error('Error resetting monthly AI usage:', error);
  }
};

// Get AI usage statistics for a user
const getAIUsageStats = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get current month's detailed usage
    const monthlyStats = await AIUsage.aggregate([
      {
        $match: {
          userId: user._id,
          timestamp: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$feature',
          requests: { $sum: 1 },
          tokens: { $sum: '$tokensUsed' }
        }
      }
    ]);

    const totalMonthlyUsage = await AIUsage.aggregate([
      {
        $match: {
          userId: user._id,
          timestamp: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$tokensUsed' }
        }
      }
    ]);

    const usage = totalMonthlyUsage[0] || { totalRequests: 0, totalTokens: 0 };
    const userLimit = user.premium.isPremium ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT;

    return {
      currentUsage: usage.totalRequests,
      totalTokens: usage.totalTokens,
      limit: userLimit,
      remaining: userLimit - usage.totalRequests,
      usagePercentage: Math.round((usage.totalRequests / userLimit) * 100),
      isPremium: user.premium.isPremium,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      featureBreakdown: monthlyStats,
      canUpgrade: !user.premium.isPremium
    };
  } catch (error) {
    console.error('Error getting AI usage stats:', error);
    return null;
  }
};

// Middleware to add AI usage info to response headers
const addUsageHeaders = (req, res, next) => {
  if (req.aiUsageInfo) {
    res.set({
      'X-AI-Usage-Current': req.aiUsageInfo.currentUsage,
      'X-AI-Usage-Limit': req.aiUsageInfo.limit,
      'X-AI-Usage-Remaining': req.aiUsageInfo.remaining,
      'X-AI-Usage-Reset': new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    });
  }
  next();
};

// Check if feature is available for user tier
const checkFeatureAccess = (requiredTier = 'free') => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (requiredTier === 'premium' && !user.premium.isPremium) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a premium subscription',
          data: {
            requiredTier: 'premium',
            currentTier: user.premium.isPremium ? 'premium' : 'free',
            upgradeUrl: '/premium'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Error checking feature access:', error);
      res.status(500).json({
        success: false,
        message: 'Server error checking feature access'
      });
    }
  };
};

module.exports = {
  checkAIUsageLimit,
  logAIUsage,
  logAIUsageAsync,
  resetMonthlyUsage,
  getAIUsageStats,
  addUsageHeaders,
  checkFeatureAccess,
  FREE_TIER_LIMIT,
  PREMIUM_TIER_LIMIT
}; 