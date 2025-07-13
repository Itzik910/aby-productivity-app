const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Task = require('../models/Task');
const Challenge = require('../models/Challenge');
const AIUsage = require('../models/AIUsage');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Private (Admin only)
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastLoginAt: { $gte: startOfWeek } 
    });
    const premiumUsers = await User.countDocuments({ 
      'premium.isPremium': true 
    });
    const newUsersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: startOfMonth } 
    });

    // Task statistics
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const tasksCreatedToday = await Task.countDocuments({ 
      createdAt: { $gte: startOfDay } 
    });
    const tasksCompletedToday = await Task.countDocuments({ 
      status: 'completed',
      completedAt: { $gte: startOfDay } 
    });

    // Challenge statistics
    const totalChallenges = await Challenge.countDocuments();
    const activeChallenges = await Challenge.countDocuments({ status: 'active' });
    const completedChallenges = await Challenge.countDocuments({ status: 'completed' });

    // AI usage statistics
    const totalAIUsage = await AIUsage.countDocuments();
    const aiUsageThisMonth = await AIUsage.countDocuments({ 
      timestamp: { $gte: startOfMonth } 
    });
    const totalTokensUsed = await AIUsage.aggregate([
      { $group: { _id: null, total: { $sum: '$tokensUsed' } } }
    ]);

    // User growth over time (last 12 months)
    const userGrowth = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate }
      });
      userGrowth.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        users: count
      });
    }

    // Task completion rates by category
    const tasksByCategory = await Task.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          category: '$_id',
          total: 1,
          completed: 1,
          completionRate: {
            $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 2]
          }
        }
      }
    ]);

    // Most active users
    const mostActiveUsers = await Task.aggregate([
      {
        $group: {
          _id: '$userId',
          taskCount: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { taskCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$_id',
          taskCount: 1,
          completedTasks: 1,
          userName: { $arrayElemAt: ['$user.name', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] }
        }
      }
    ]);

    // System performance metrics
    const systemMetrics = {
      averageTasksPerUser: totalUsers > 0 ? Math.round(totalTasks / totalUsers) : 0,
      overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      averageAIUsagePerUser: totalUsers > 0 ? Math.round(totalAIUsage / totalUsers) : 0,
      premiumConversionRate: totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0
    };

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          premium: premiumUsers,
          newThisMonth: newUsersThisMonth,
          growth: userGrowth
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          createdToday: tasksCreatedToday,
          completedToday: tasksCompletedToday,
          byCategory: tasksByCategory
        },
        challenges: {
          total: totalChallenges,
          active: activeChallenges,
          completed: completedChallenges
        },
        aiUsage: {
          total: totalAIUsage,
          thisMonth: aiUsageThisMonth,
          totalTokens: totalTokensUsed[0]?.total || 0
        },
        mostActiveUsers,
        systemMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin only)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = 'all',
      premium = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.lastLoginAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (status === 'inactive') {
      query.lastLoginAt = { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    if (premium === 'premium') {
      query['premium.isPremium'] = true;
    } else if (premium === 'free') {
      query['premium.isPremium'] = false;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    // Get additional stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const taskCount = await Task.countDocuments({ userId: user._id });
        const completedTasks = await Task.countDocuments({ 
          userId: user._id, 
          status: 'completed' 
        });
        const aiUsage = await AIUsage.countDocuments({ userId: user._id });

        return {
          ...user.toObject(),
          stats: {
            totalTasks: taskCount,
            completedTasks,
            aiUsage,
            completionRate: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNextPage: page * limit < totalUsers,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get detailed user information
// @access  Private (Admin only)
router.get('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's tasks
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 }).limit(50);
    
    // Get user's AI usage
    const aiUsage = await AIUsage.find({ userId }).sort({ timestamp: -1 }).limit(50);
    
    // Get user's challenge participation
    const challenges = await Challenge.find({ participants: userId }).sort({ createdAt: -1 });

    // Calculate user statistics
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const totalAITokens = aiUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0);
    
    const userStats = {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      pendingTasks: tasks.filter(task => task.status === 'pending').length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      totalAIUsage: aiUsage.length,
      totalAITokens,
      challengesParticipated: challenges.length,
      averageTasksPerDay: tasks.length > 0 ? Math.round(tasks.length / 30) : 0 // Assuming 30 days
    };

    res.json({
      success: true,
      data: {
        user,
        tasks,
        aiUsage,
        challenges,
        stats: userStats
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user information
// @access  Private (Admin only)
router.put('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    // Don't allow password updates through this route
    delete updates.password;
    delete updates.refreshToken;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        message: 'User updated successfully',
        user
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user and all associated data
// @access  Private (Admin only)
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user's tasks
    await Task.deleteMany({ userId });
    
    // Delete user's AI usage records
    await AIUsage.deleteMany({ userId });
    
    // Remove user from challenges
    await Challenge.updateMany(
      { participants: userId },
      { $pull: { participants: userId } }
    );
    
    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      data: {
        message: 'User and all associated data deleted successfully'
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/users/:id/premium
// @desc    Toggle user premium status
// @access  Private (Admin only)
router.post('/users/:id/premium', auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { isPremium } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.premium.isPremium = isPremium;
    if (isPremium) {
      user.premium.upgradeDate = new Date();
      user.premium.premiumFeatures = [
        'unlimited_ai_usage',
        'advanced_analytics',
        'custom_challenges',
        'priority_support',
        'export_data'
      ];
    } else {
      user.premium.upgradeDate = null;
      user.premium.premiumFeatures = [];
    }

    await user.save();

    res.json({
      success: true,
      data: {
        message: `User premium status ${isPremium ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          premium: user.premium
        }
      }
    });
  } catch (error) {
    console.error('Error toggling premium status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/system-health
// @desc    Get system health metrics
// @access  Private (Admin only)
router.get('/system-health', auth, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Recent activity metrics
    const recentUsers = await User.countDocuments({ 
      lastLoginAt: { $gte: oneHourAgo } 
    });
    const recentTasks = await Task.countDocuments({ 
      createdAt: { $gte: oneHourAgo } 
    });
    const recentAIUsage = await AIUsage.countDocuments({ 
      timestamp: { $gte: oneHourAgo } 
    });

    // Daily activity metrics
    const dailyUsers = await User.countDocuments({ 
      lastLoginAt: { $gte: oneDayAgo } 
    });
    const dailyTasks = await Task.countDocuments({ 
      createdAt: { $gte: oneDayAgo } 
    });
    const dailyAIUsage = await AIUsage.countDocuments({ 
      timestamp: { $gte: oneDayAgo } 
    });

    // Error rates (simplified - in production, you'd track actual errors)
    const errorRate = Math.random() * 0.1; // Mock error rate
    const responseTime = Math.random() * 100 + 50; // Mock response time

    // Database health
    const dbHealth = {
      status: 'healthy',
      connections: Math.floor(Math.random() * 50) + 10,
      responseTime: Math.floor(Math.random() * 20) + 5
    };

    res.json({
      success: true,
      data: {
        timestamp: now,
        activity: {
          recent: {
            users: recentUsers,
            tasks: recentTasks,
            aiUsage: recentAIUsage
          },
          daily: {
            users: dailyUsers,
            tasks: dailyTasks,
            aiUsage: dailyAIUsage
          }
        },
        performance: {
          errorRate: Math.round(errorRate * 1000) / 1000,
          responseTime: Math.round(responseTime),
          uptime: process.uptime()
        },
        database: dbHealth,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/broadcast
// @desc    Send broadcast notification to all users
// @access  Private (Admin only)
router.post('/broadcast', auth, isAdmin, async (req, res) => {
  try {
    const { title, message, type = 'info', targetGroup = 'all' } = req.body;
    
    let userQuery = {};
    
    // Target specific user groups
    if (targetGroup === 'premium') {
      userQuery['premium.isPremium'] = true;
    } else if (targetGroup === 'free') {
      userQuery['premium.isPremium'] = false;
    } else if (targetGroup === 'active') {
      userQuery.lastLoginAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }
    
    const users = await User.find(userQuery).select('_id name email');
    
    // In production, you would queue these notifications
    // For now, we'll just log them
    users.forEach(user => {
      console.log(`Broadcast notification sent to ${user.email}:`, {
        title,
        message,
        type
      });
    });

    res.json({
      success: true,
      data: {
        message: `Broadcast sent to ${users.length} users`,
        targetGroup,
        userCount: users.length
      }
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/export
// @desc    Export system data
// @access  Private (Admin only)
router.get('/export', auth, isAdmin, async (req, res) => {
  try {
    const { type = 'users', format = 'json' } = req.query;
    
    let data;
    let filename;
    
    switch (type) {
      case 'users':
        data = await User.find().select('-password -refreshToken');
        filename = 'users-export';
        break;
      case 'tasks':
        data = await Task.find().populate('userId', 'name email');
        filename = 'tasks-export';
        break;
      case 'challenges':
        data = await Challenge.find().populate('participants', 'name email');
        filename = 'challenges-export';
        break;
      case 'ai-usage':
        data = await AIUsage.find().populate('userId', 'name email');
        filename = 'ai-usage-export';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV (simplified)
      const csvData = JSON.stringify(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data: {
          type,
          exportedAt: new Date(),
          count: data.length,
          data
        }
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 