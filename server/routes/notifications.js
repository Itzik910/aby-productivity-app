const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');

// Helper: create notification and push via Socket.IO if available
const createNotification = async (userId, type, title, message, data = {}, io = null) => {
  const notification = await Notification.createForUser(userId, {
    type,
    title,
    message,
    data,
    priority: data.priority || 'medium',
  });

  // Real-time delivery via Socket.IO
  if (io) {
    io.to(String(userId)).emit('notification', {
      id: String(notification._id),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: false,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return notification;
};

module.exports.createNotification = createNotification;

// @route   GET /api/notifications
// @desc    Get user notifications (from MongoDB)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { user: userId };
    if (unreadOnly === 'true') query.read = false;

    const [notifs, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    const formatted = notifs.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data,
      read: n.read,
      createdAt: n.createdAt,
      priority: n.priority,
    }));

    res.json({
      success: true,
      notifications: formatted,
      unreadCount,
      totalCount: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/notifications/mark-read
// @desc    Mark notification(s) as read
// @access  Private
router.post('/mark-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationIds, markAll = false } = req.body;

    if (markAll) {
      await Notification.updateMany({ user: userId, read: false }, { read: true, readAt: new Date() });
    } else if (Array.isArray(notificationIds) && notificationIds.length) {
      await Notification.updateMany(
        { user: userId, _id: { $in: notificationIds } },
        { read: true, readAt: new Date() }
      );
    }

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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