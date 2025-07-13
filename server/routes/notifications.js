const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const Challenge = require('../models/Challenge');

// In-memory notification storage (in production, use Redis or MongoDB)
const notifications = new Map();

// Notification types
const NOTIFICATION_TYPES = {
  TASK_DUE: 'task_due',
  TASK_OVERDUE: 'task_overdue',
  CHALLENGE_STARTED: 'challenge_started',
  CHALLENGE_COMPLETED: 'challenge_completed',
  STREAK_MILESTONE: 'streak_milestone',
  PRODUCTIVITY_INSIGHT: 'productivity_insight',
  WEEKLY_SUMMARY: 'weekly_summary',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  REMINDER: 'reminder'
};

// Helper function to create notification
const createNotification = (userId, type, title, message, data = {}) => {
  const notification = {
    id: Date.now() + Math.random(),
    userId,
    type,
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
    priority: data.priority || 'medium'
  };

  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }
  
  notifications.get(userId).unshift(notification);
  
  // Keep only last 100 notifications per user
  if (notifications.get(userId).length > 100) {
    notifications.get(userId).splice(100);
  }

  return notification;
};

// Helper function to send email notification
const sendEmailNotification = async (user, notification) => {
  // In production, integrate with email service (SendGrid, Mailgun, etc.)
  console.log(`Email notification sent to ${user.email}:`, {
    subject: notification.title,
    body: notification.message
  });
};

// Helper function to send push notification
const sendPushNotification = async (user, notification) => {
  // In production, integrate with push service (FCM, APNs, etc.)
  console.log(`Push notification sent to ${user.name}:`, {
    title: notification.title,
    body: notification.message
  });
};

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const userNotifications = notifications.get(userId) || [];
    
    let filteredNotifications = userNotifications;
    if (unreadOnly === 'true') {
      filteredNotifications = userNotifications.filter(n => !n.read);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
    
    const unreadCount = userNotifications.filter(n => !n.read).length;
    
    res.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        unreadCount,
        totalCount: filteredNotifications.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(filteredNotifications.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/mark-read
// @desc    Mark notification(s) as read
// @access  Private
router.post('/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds, markAll = false } = req.body;
    
    const userNotifications = notifications.get(userId) || [];
    
    if (markAll) {
      userNotifications.forEach(notification => {
        notification.read = true;
      });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      userNotifications.forEach(notification => {
        if (notificationIds.includes(notification.id)) {
          notification.read = true;
        }
      });
    }
    
    const unreadCount = userNotifications.filter(n => !n.read).length;
    
    res.json({
      success: true,
      data: {
        message: markAll ? 'All notifications marked as read' : 'Notifications marked as read',
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);
    
    const userNotifications = notifications.get(userId) || [];
    const notificationIndex = userNotifications.findIndex(n => n.id === notificationId);
    
    if (notificationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    userNotifications.splice(notificationIndex, 1);
    
    res.json({
      success: true,
      data: {
        message: 'Notification deleted successfully'
      }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/preferences
// @desc    Update notification preferences
// @access  Private
router.post('/preferences', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, push, frequency, types } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user.preferences) {
      user.preferences = {};
    }
    
    if (!user.preferences.notifications) {
      user.preferences.notifications = {};
    }
    
    // Update notification preferences
    if (email !== undefined) user.preferences.notifications.email = email;
    if (push !== undefined) user.preferences.notifications.push = push;
    if (frequency !== undefined) user.preferences.notifications.frequency = frequency;
    if (types !== undefined) user.preferences.notifications.types = types;
    
    await user.save();
    
    res.json({
      success: true,
      data: {
        message: 'Notification preferences updated successfully',
        preferences: user.preferences.notifications
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification (internal use)
// @access  Private
router.post('/send', auth, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;
    
    // Create notification
    const notification = createNotification(userId, type, title, message, data);
    
    // Get user preferences
    const user = await User.findById(userId);
    const preferences = user.preferences?.notifications || {};
    
    // Send email notification if enabled
    if (preferences.email && shouldSendNotification(type, preferences)) {
      await sendEmailNotification(user, notification);
    }
    
    // Send push notification if enabled
    if (preferences.push && shouldSendNotification(type, preferences)) {
      await sendPushNotification(user, notification);
    }
    
    res.json({
      success: true,
      data: {
        message: 'Notification sent successfully',
        notification
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/schedule
// @desc    Schedule a notification
// @access  Private
router.post('/schedule', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, message, scheduledFor, data } = req.body;
    
    const scheduledTime = new Date(scheduledFor);
    const now = new Date();
    
    if (scheduledTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }
    
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Schedule notification
    setTimeout(() => {
      createNotification(userId, type, title, message, data);
    }, delay);
    
    res.json({
      success: true,
      data: {
        message: 'Notification scheduled successfully',
        scheduledFor: scheduledTime
      }
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/notifications/check-due-tasks
// @desc    Check for due tasks and send notifications
// @access  Private
router.get('/check-due-tasks', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Find tasks due within the next hour
    const dueTasks = await Task.find({
      userId,
      status: { $ne: 'completed' },
      dueDate: { $gte: now, $lte: oneHourFromNow }
    });
    
    // Find overdue tasks
    const overdueTasks = await Task.find({
      userId,
      status: { $ne: 'completed' },
      dueDate: { $lt: now }
    });
    
    // Send notifications for due tasks
    dueTasks.forEach(task => {
      const timeUntilDue = Math.round((task.dueDate.getTime() - now.getTime()) / (1000 * 60));
      createNotification(
        userId,
        NOTIFICATION_TYPES.TASK_DUE,
        'Task Due Soon',
        `"${task.title}" is due in ${timeUntilDue} minutes`,
        { taskId: task._id, priority: 'high' }
      );
    });
    
    // Send notifications for overdue tasks
    overdueTasks.forEach(task => {
      const overdueDays = Math.floor((now.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      createNotification(
        userId,
        NOTIFICATION_TYPES.TASK_OVERDUE,
        'Task Overdue',
        `"${task.title}" is ${overdueDays} day(s) overdue`,
        { taskId: task._id, priority: 'high' }
      );
    });
    
    res.json({
      success: true,
      data: {
        dueTasksCount: dueTasks.length,
        overdueTasksCount: overdueTasks.length,
        message: 'Task notifications checked and sent'
      }
    });
  } catch (error) {
    console.error('Error checking due tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/weekly-summary
// @desc    Generate and send weekly summary
// @access  Private
router.post('/weekly-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get weekly stats
    const weeklyTasks = await Task.find({
      userId,
      createdAt: { $gte: weekStart }
    });
    
    const completedTasks = weeklyTasks.filter(task => task.status === 'completed');
    const completionRate = weeklyTasks.length > 0 ? 
      Math.round((completedTasks.length / weeklyTasks.length) * 100) : 0;
    
    // Get active challenges
    const activeChallenges = await Challenge.find({
      participants: userId,
      status: 'active'
    });
    
    const summaryMessage = `
      Weekly Summary:
      • Completed ${completedTasks.length} out of ${weeklyTasks.length} tasks (${completionRate}%)
      • Participating in ${activeChallenges.length} active challenges
      • Keep up the great work!
    `;
    
    createNotification(
      userId,
      NOTIFICATION_TYPES.WEEKLY_SUMMARY,
      'Your Weekly Summary',
      summaryMessage,
      {
        tasksCompleted: completedTasks.length,
        totalTasks: weeklyTasks.length,
        completionRate,
        activeChallenges: activeChallenges.length
      }
    );
    
    res.json({
      success: true,
      data: {
        message: 'Weekly summary sent successfully',
        summary: {
          tasksCompleted: completedTasks.length,
          totalTasks: weeklyTasks.length,
          completionRate,
          activeChallenges: activeChallenges.length
        }
      }
    });
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/notifications/push-subscription
// @desc    Subscribe to push notifications
// @access  Private
router.post('/push-subscription', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription } = req.body;
    
    // Store push subscription (in production, save to database)
    console.log('Push subscription received for user:', userId, subscription);
    
    // In production, you would:
    // 1. Store the subscription in the database
    // 2. Validate the subscription
    // 3. Set up push notification service
    
    res.json({
      success: true,
      data: {
        message: 'Push notification subscription successful'
      }
    });
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to determine if notification should be sent based on preferences
const shouldSendNotification = (type, preferences) => {
  if (!preferences.types) return true;
  
  // Check if this notification type is enabled
  if (preferences.types[type] === false) return false;
  
  // Check frequency settings
  if (preferences.frequency === 'daily') {
    // Only send daily digest notifications
    return type === NOTIFICATION_TYPES.WEEKLY_SUMMARY;
  }
  
  if (preferences.frequency === 'weekly') {
    // Only send weekly digest notifications
    return type === NOTIFICATION_TYPES.WEEKLY_SUMMARY;
  }
  
  // Default to immediate notifications
  return true;
};

// Background job to check for due tasks (in production, use a job queue)
setInterval(async () => {
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Find all users with tasks due soon
    const dueTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $gte: now, $lte: oneHourFromNow }
    }).populate('userId', 'name email preferences');
    
    dueTasks.forEach(task => {
      const timeUntilDue = Math.round((task.dueDate.getTime() - now.getTime()) / (1000 * 60));
      const notification = createNotification(
        task.userId._id,
        NOTIFICATION_TYPES.TASK_DUE,
        'Task Due Soon',
        `"${task.title}" is due in ${timeUntilDue} minutes`,
        { taskId: task._id, priority: 'high' }
      );
      
      // Send push/email if enabled
      const preferences = task.userId.preferences?.notifications || {};
      if (preferences.push && shouldSendNotification(NOTIFICATION_TYPES.TASK_DUE, preferences)) {
        sendPushNotification(task.userId, notification);
      }
      if (preferences.email && shouldSendNotification(NOTIFICATION_TYPES.TASK_DUE, preferences)) {
        sendEmailNotification(task.userId, notification);
      }
    });
  } catch (error) {
    console.error('Error in background task check:', error);
  }
}, 15 * 60 * 1000); // Check every 15 minutes

module.exports = router; 