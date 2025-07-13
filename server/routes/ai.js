const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { checkAIUsageLimit, logAIUsage, addUsageHeaders, checkFeatureAccess } = require('../middleware/aiLimits');
const { generateTaskSuggestions, generateMotivationalMessage, analyzeProductivity } = require('../services/aiService');
const Task = require('../models/Task');
const User = require('../models/User');
const AIUsage = require('../models/AIUsage');

// Apply AI usage middleware to all routes
router.use(auth);
router.use(checkAIUsageLimit);
router.use(addUsageHeaders);

// @route   POST /api/ai/suggestions
// @desc    Get AI-powered task suggestions
// @access  Private
router.post('/suggestions', logAIUsage, async (req, res) => {
  try {
    const userId = req.user.id;
    const { context, preferences } = req.body;

    // Get user's recent tasks and patterns
    const recentTasks = await Task.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const user = await User.findById(userId);
    
    // Prepare context for AI
    const userContext = {
      profession: user.profession,
      recentTasks: recentTasks.map(task => ({
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: task.status,
        completedAt: task.completedAt
      })),
      preferences: preferences || user.preferences,
      currentTime: new Date().toISOString(),
      ...context
    };

    // Generate AI suggestions
    const suggestions = await generateTaskSuggestions(userContext);

    // Set tokens used for logging
    req.aiTokensUsed = suggestions.tokensUsed || 0;

    res.json({
      success: true,
      data: {
        suggestions: suggestions.suggestions,
        reasoning: suggestions.reasoning,
        categories: suggestions.categories,
        estimatedTimes: suggestions.estimatedTimes
      }
    });
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ai/motivation
// @desc    Get AI-generated motivational message
// @access  Private
router.post('/motivation', logAIUsage, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood, context } = req.body;

    // Get user's recent activity
    const recentTasks = await Task.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const user = await User.findById(userId);
    
    // Calculate recent productivity
    const completedTasks = recentTasks.filter(task => task.status === 'completed');
    const productivityScore = recentTasks.length > 0 ? 
      Math.round((completedTasks.length / recentTasks.length) * 100) : 0;

    const motivationContext = {
      mood,
      productivityScore,
      recentTasksCount: recentTasks.length,
      completedTasksCount: completedTasks.length,
      userName: user.name,
      profession: user.profession,
      currentStreak: user.stats?.currentStreak || 0,
      ...context
    };

    // Generate motivational message
    const motivationData = await generateMotivationalMessage(motivationContext);

    // Set tokens used for logging
    req.aiTokensUsed = motivationData.tokensUsed || 0;

    res.json({
      success: true,
      data: {
        message: motivationData.message,
        tips: motivationData.tips,
        affirmation: motivationData.affirmation,
        actionItems: motivationData.actionItems
      }
    });
  } catch (error) {
    console.error('Error getting motivational message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ai/analyze-productivity
// @desc    Get AI analysis of user's productivity patterns
// @access  Private (Premium feature)
router.post('/analyze-productivity', checkFeatureAccess('premium'), logAIUsage, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeRange = 'week' } = req.body;

    // Get tasks based on time range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const tasks = await Task.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    const user = await User.findById(userId);

    // Prepare data for analysis
    const productivityData = {
      tasks: tasks.map(task => ({
        title: task.title,
        category: task.category,
        priority: task.priority,
        status: task.status,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        estimatedTime: task.estimatedTime,
        dueDate: task.dueDate
      })),
      timeRange,
      user: {
        profession: user.profession,
        preferences: user.preferences
      }
    };

    // Get AI analysis
    const analysis = await analyzeProductivity(productivityData);

    // Set tokens used for logging
    req.aiTokensUsed = analysis.tokensUsed || 0;

    res.json({
      success: true,
      data: {
        insights: analysis.insights,
        patterns: analysis.patterns,
        recommendations: analysis.recommendations,
        strengths: analysis.strengths,
        areasForImprovement: analysis.areasForImprovement,
        optimizedSchedule: analysis.optimizedSchedule
      }
    });
  } catch (error) {
    console.error('Error analyzing productivity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ai/optimize-task
// @desc    Get AI optimization suggestions for a specific task
// @access  Private
router.post('/optimize-task', logAIUsage, async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId, taskData } = req.body;

    let task;
    if (taskId) {
      task = await Task.findOne({ _id: taskId, userId });
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
    } else if (taskData) {
      task = taskData;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Task ID or task data required'
      });
    }

    // Get related tasks for context
    const relatedTasks = await Task.find({
      userId,
      category: task.category,
      status: 'completed'
    }).limit(10);

    const user = await User.findById(userId);

    const optimizationContext = {
      task: {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        estimatedTime: task.estimatedTime,
        dueDate: task.dueDate
      },
      relatedTasks: relatedTasks.map(t => ({
        title: t.title,
        estimatedTime: t.estimatedTime,
        actualTime: t.actualTime,
        completedAt: t.completedAt
      })),
      userProfile: {
        profession: user.profession,
        preferences: user.preferences
      }
    };

    // Generate optimization suggestions
    const optimization = await generateTaskSuggestions(optimizationContext, 'optimize');

    // Set tokens used for logging
    req.aiTokensUsed = optimization.tokensUsed || 0;

    res.json({
      success: true,
      data: {
        optimizedTitle: optimization.optimizedTitle,
        optimizedDescription: optimization.optimizedDescription,
        suggestedSteps: optimization.suggestedSteps,
        timeEstimate: optimization.timeEstimate,
        priorityRecommendation: optimization.priorityRecommendation,
        bestTimeToWork: optimization.bestTimeToWork,
        resources: optimization.resources,
        tips: optimization.tips
      }
    });
  } catch (error) {
    console.error('Error optimizing task:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ai/smart-scheduling
// @desc    Get AI-powered smart scheduling suggestions
// @access  Private (Premium feature)
router.post('/smart-scheduling', checkFeatureAccess('premium'), logAIUsage, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks, preferences, timeSlots } = req.body;

    // Get user's historical data
    const historicalTasks = await Task.find({ userId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(100);

    const user = await User.findById(userId);

    // Analyze productivity patterns
    const productivityPatterns = {};
    historicalTasks.forEach(task => {
      if (task.completedAt) {
        const hour = new Date(task.completedAt).getHours();
        const day = new Date(task.completedAt).getDay();
        const key = `${day}-${hour}`;
        
        if (!productivityPatterns[key]) {
          productivityPatterns[key] = { count: 0, totalTime: 0 };
        }
        
        productivityPatterns[key].count++;
        productivityPatterns[key].totalTime += task.estimatedTime || 0;
      }
    });

    const schedulingContext = {
      tasks: tasks || [],
      preferences: preferences || user.preferences,
      timeSlots: timeSlots || [],
      productivityPatterns,
      userProfile: {
        profession: user.profession,
        timezone: user.timezone || 'UTC'
      }
    };

    // Generate smart schedule
    const schedule = await generateTaskSuggestions(schedulingContext, 'schedule');

    // Set tokens used for logging
    req.aiTokensUsed = schedule.tokensUsed || 0;

    res.json({
      success: true,
      data: {
        scheduledTasks: schedule.scheduledTasks,
        recommendations: schedule.recommendations,
        optimalTimeSlots: schedule.optimalTimeSlots,
        productivityScore: schedule.productivityScore,
        conflicts: schedule.conflicts,
        alternatives: schedule.alternatives
      }
    });
  } catch (error) {
    console.error('Error generating smart schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/ai/usage-stats
// @desc    Get AI usage statistics
// @access  Private
router.get('/usage-stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeRange = 'month' } = req.query;

    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    const aiUsage = await AIUsage.find({
      userId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });

    // Aggregate usage by feature
    const featureUsage = {};
    let totalTokens = 0;

    aiUsage.forEach(usage => {
      const feature = usage.feature;
      if (!featureUsage[feature]) {
        featureUsage[feature] = { count: 0, tokens: 0 };
      }
      featureUsage[feature].count++;
      featureUsage[feature].tokens += usage.tokensUsed;
      totalTokens += usage.tokensUsed;
    });

    // Daily usage pattern
    const dailyUsage = {};
    aiUsage.forEach(usage => {
      const date = usage.timestamp.toISOString().split('T')[0];
      if (!dailyUsage[date]) {
        dailyUsage[date] = { count: 0, tokens: 0 };
      }
      dailyUsage[date].count++;
      dailyUsage[date].tokens += usage.tokensUsed;
    });

    res.json({
      success: true,
      data: {
        totalUsage: aiUsage.length,
        totalTokens,
        timeRange,
        usageInfo: req.aiUsageInfo, // From middleware
        featureUsage: Object.keys(featureUsage).map(feature => ({
          feature,
          count: featureUsage[feature].count,
          tokens: featureUsage[feature].tokens,
          percentage: aiUsage.length > 0 ? Math.round((featureUsage[feature].count / aiUsage.length) * 100) : 0
        })),
        dailyUsage: Object.keys(dailyUsage).map(date => ({
          date,
          count: dailyUsage[date].count,
          tokens: dailyUsage[date].tokens
        })).sort((a, b) => a.date.localeCompare(b.date)),
        averageTokensPerRequest: aiUsage.length > 0 ? Math.round(totalTokens / aiUsage.length) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/ai/feedback
// @desc    Submit feedback on AI suggestions
// @access  Private
router.post('/feedback', async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature, rating, feedback, suggestedImprovement } = req.body;

    // Store feedback in database (you could create a Feedback model)
    console.log('AI Feedback received:', {
      userId,
      feature,
      rating,
      feedback,
      suggestedImprovement,
      timestamp: new Date()
    });

    // In a real implementation, you would:
    // 1. Store this in a feedback collection
    // 2. Use it to improve the AI models
    // 3. Send to analytics service

    res.json({
      success: true,
      message: 'Feedback received successfully'
    });
  } catch (error) {
    console.error('Error submitting AI feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 