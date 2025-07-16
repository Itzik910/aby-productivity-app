const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const AIUsage = require('../models/AIUsage');

// @route   GET /api/analytics/dashboard
// @desc    Get user analytics dashboard
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get user's tasks
    const allTasks = await Task.find({ user: userId }).sort({ createdAt: -1 });
    const todayTasks = allTasks.filter(task => task.createdAt >= startOfDay);
    const weekTasks = allTasks.filter(task => task.createdAt >= startOfWeek);
    const monthTasks = allTasks.filter(task => task.createdAt >= startOfMonth);

    // Calculate completion rates
    const completedTasks = allTasks.filter(task => task.status === 'completed');
    const completedToday = todayTasks.filter(task => task.status === 'completed');
    const completedWeek = weekTasks.filter(task => task.status === 'completed');
    const completedMonth = monthTasks.filter(task => task.status === 'completed');

    // Calculate productivity scores
    const dailyProductivity = todayTasks.length > 0 ? 
      Math.round((completedToday.length / todayTasks.length) * 100) : 0;
    const weeklyProductivity = weekTasks.length > 0 ? 
      Math.round((completedWeek.length / weekTasks.length) * 100) : 0;
    const monthlyProductivity = monthTasks.length > 0 ? 
      Math.round((completedMonth.length / monthTasks.length) * 100) : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedCompletedTasks = completedTasks.sort((a, b) => b.completedAt - a.completedAt);
    
    // Calculate current streak
    let currentDate = new Date(startOfDay);
    for (let i = 0; i < 30; i++) {
      const dayTasks = sortedCompletedTasks.filter(task => {
        const taskDate = new Date(task.completedAt);
        return taskDate.toDateString() === currentDate.toDateString();
      });
      
      if (dayTasks.length > 0) {
        currentStreak++;
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === 0) break; // No tasks today means streak is broken
        tempStreak = 0;
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Time spent analysis
    const timeSpentToday = todayTasks.reduce((total, task) => {
      return total + (task.estimatedTime || 0);
    }, 0) / 60; // Convert to hours

    const timeSpentWeek = weekTasks.reduce((total, task) => {
      return total + (task.estimatedTime || 0);
    }, 0) / 60;

    const timeSpentMonth = monthTasks.reduce((total, task) => {
      return total + (task.estimatedTime || 0);
    }, 0) / 60;

    // Category analysis
    const categoryStats = {};
    allTasks.forEach(task => {
      const category = task.category || 'uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, completed: 0 };
      }
      categoryStats[category].total++;
      if (task.status === 'completed') {
        categoryStats[category].completed++;
      }
    });

    // Weekly progress (last 7 days)
    const weeklyProgress = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(startOfDay);
      date.setDate(date.getDate() - i);
      const dayTasks = allTasks.filter(task => {
        const taskDate = new Date(task.createdAt);
        return taskDate.toDateString() === date.toDateString();
      });
      const dayCompleted = dayTasks.filter(task => task.status === 'completed');
      
      weeklyProgress.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: dayCompleted.length,
        total: dayTasks.length,
        target: 5 // Default target of 5 tasks per day
      });
    }

    // Priority distribution
    const priorityStats = {
      high: { total: 0, completed: 0 },
      medium: { total: 0, completed: 0 },
      low: { total: 0, completed: 0 }
    };

    allTasks.forEach(task => {
      const priority = task.priority || 'medium';
      if (priorityStats[priority]) {
        priorityStats[priority].total++;
        if (task.status === 'completed') {
          priorityStats[priority].completed++;
        }
      }
    });

    // AI usage stats
    const aiUsage = await AIUsage.find({ user: userId }).sort({ timestamp: -1 }).limit(100);
    const aiUsageToday = aiUsage.filter(usage => usage.timestamp >= startOfDay);
    const aiUsageWeek = aiUsage.filter(usage => usage.timestamp >= startOfWeek);

    // Peak performance analysis
    const hourlyStats = {};
    completedTasks.forEach(task => {
      if (task.completedAt) {
        const hour = new Date(task.completedAt).getHours();
        hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
      }
    });

    const peakHour = Object.keys(hourlyStats).reduce((a, b) => 
      hourlyStats[a] > hourlyStats[b] ? a : b, '9'
    );

    // Generate insights
    const insights = [];
    
    if (weeklyProductivity > 80) {
      insights.push({
        type: 'positive',
        title: 'Excellent Performance',
        description: `Your weekly productivity is ${weeklyProductivity}% - keep up the great work!`
      });
    }

    if (currentStreak >= 7) {
      insights.push({
        type: 'positive',
        title: 'Streak Master',
        description: `You're on a ${currentStreak}-day streak! You're building great habits.`
      });
    }

    if (peakHour && hourlyStats[peakHour] > 5) {
      const hour12 = peakHour > 12 ? `${peakHour - 12}PM` : `${peakHour}AM`;
      insights.push({
        type: 'info',
        title: 'Peak Performance Time',
        description: `You're most productive around ${hour12}. Consider scheduling important tasks then.`
      });
    }

    if (weeklyProductivity < 50) {
      insights.push({
        type: 'warning',
        title: 'Room for Improvement',
        description: 'Your completion rate is below 50%. Try breaking tasks into smaller chunks.'
      });
    }

    res.json({
      success: true,
      data: {
        productivity: {
          daily: dailyProductivity,
          weekly: weeklyProductivity,
          monthly: monthlyProductivity
        },
        tasks: {
          completed: completedTasks.length,
          pending: allTasks.filter(task => task.status === 'pending').length,
          overdue: allTasks.filter(task => 
            task.status !== 'completed' && 
            task.dueDate && 
            new Date(task.dueDate) < now
          ).length,
          total: allTasks.length
        },
        streaks: {
          current: currentStreak,
          longest: longestStreak
        },
        timeSpent: {
          today: Math.round(timeSpentToday * 10) / 10,
          week: Math.round(timeSpentWeek * 10) / 10,
          month: Math.round(timeSpentMonth * 10) / 10
        },
        categories: Object.keys(categoryStats).map(category => ({
          name: category,
          total: categoryStats[category].total,
          completed: categoryStats[category].completed,
          completionRate: Math.round((categoryStats[category].completed / categoryStats[category].total) * 100)
        })),
        weeklyProgress,
        priorityStats,
        aiUsage: {
          today: aiUsageToday.length,
          week: aiUsageWeek.length,
          total: aiUsage.length
        },
        insights,
        peakHour: parseInt(peakHour),
        averageTaskTime: allTasks.length > 0 ? 
          Math.round(allTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0) / allTasks.length) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/productivity-trends
// @desc    Get productivity trends over time
// @access  Private
router.get('/productivity-trends', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;
    
    const now = new Date();
    let startDate;
    let groupBy;
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        groupBy = 'day';
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        groupBy = 'month';
        break;
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
    }

    const tasks = await Task.find({
      user: userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    const trends = {};
    tasks.forEach(task => {
      let key;
      const date = new Date(task.createdAt);
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!trends[key]) {
        trends[key] = { total: 0, completed: 0 };
      }
      
      trends[key].total++;
      if (task.status === 'completed') {
        trends[key].completed++;
      }
    });

    const trendData = Object.keys(trends).map(key => ({
      period: key,
      total: trends[key].total,
      completed: trends[key].completed,
      completionRate: Math.round((trends[key].completed / trends[key].total) * 100)
    }));

    res.json({
      success: true,
      data: {
        period,
        trends: trendData
      }
    });
  } catch (error) {
    console.error('Error fetching productivity trends:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/analytics/time-distribution
// @desc    Get time distribution across categories and priorities
// @access  Private
router.get('/time-distribution', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = await Task.find({ user: userId, status: 'completed' });

    const categoryDistribution = {};
    const priorityDistribution = {};
    let totalTime = 0;

    tasks.forEach(task => {
      const time = task.estimatedTime || 0;
      totalTime += time;

      // Category distribution
      const category = task.category || 'uncategorized';
      categoryDistribution[category] = (categoryDistribution[category] || 0) + time;

      // Priority distribution
      const priority = task.priority || 'medium';
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + time;
    });

    const categoryData = Object.keys(categoryDistribution).map(category => ({
      category,
      time: Math.round(categoryDistribution[category] / 60 * 10) / 10, // Convert to hours
      percentage: Math.round((categoryDistribution[category] / totalTime) * 100)
    }));

    const priorityData = Object.keys(priorityDistribution).map(priority => ({
      priority,
      time: Math.round(priorityDistribution[priority] / 60 * 10) / 10, // Convert to hours
      percentage: Math.round((priorityDistribution[priority] / totalTime) * 100)
    }));

    res.json({
      success: true,
      data: {
        totalTime: Math.round(totalTime / 60 * 10) / 10, // Convert to hours
        categoryDistribution: categoryData,
        priorityDistribution: priorityData
      }
    });
  } catch (error) {
    console.error('Error fetching time distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/analytics/export
// @desc    Export analytics data
// @access  Private
router.post('/export', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', dateRange } = req.body;

    let startDate, endDate;
    if (dateRange) {
      startDate = new Date(dateRange.start);
      endDate = new Date(dateRange.end);
    } else {
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    }

    const tasks = await Task.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });

    const user = await User.findById(userId).select('name email');
    const aiUsage = await AIUsage.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const exportData = {
      user: {
        name: user.name,
        email: user.email
      },
      exportDate: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      tasks: tasks.map(task => ({
        id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        category: task.category,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        dueDate: task.dueDate,
        estimatedTime: task.estimatedTime,
        location: task.location
      })),
      aiUsage: aiUsage.map(usage => ({
        feature: usage.feature,
        tokensUsed: usage.tokensUsed,
        timestamp: usage.timestamp
      })),
      summary: {
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        totalTimeSpent: tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0),
        aiUsageCount: aiUsage.length,
        totalAITokens: aiUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0)
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Title,Description,Status,Priority,Category,Created,Completed,Due Date,Estimated Time\n';
      const csvData = tasks.map(task => [
        task.title,
        task.description || '',
        task.status,
        task.priority,
        task.category || '',
        task.createdAt.toISOString(),
        task.completedAt ? task.completedAt.toISOString() : '',
        task.dueDate ? task.dueDate.toISOString() : '',
        task.estimatedTime || 0
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
      res.send(csvHeaders + csvData);
    } else {
      res.json({
        success: true,
        data: exportData
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 