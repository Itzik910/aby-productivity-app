const webpush = require('web-push');
const User = require('../models/User');

// Configure VAPID keys only if they are properly set
let vapidConfigured = false;
try {
  if (process.env.VAPID_PUBLIC_KEY && 
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_PUBLIC_KEY !== 'your-vapid-public-key' &&
      process.env.VAPID_PRIVATE_KEY !== 'your-vapid-private-key') {
    
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:' + (process.env.SMTP_FROM || 'noreply@abyproductivity.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    console.log('✓ Push notifications configured successfully');
  } else {
    console.log('⚠ Push notifications disabled - VAPID keys not configured');
  }
} catch (error) {
  console.log('⚠ Push notifications disabled - Invalid VAPID keys:', error.message);
}

// Check if push notifications are configured
const isPushConfigured = () => {
  return vapidConfigured;
};

// Store push subscription for a user
const storePushSubscription = async (userId, subscription) => {
  try {
    if (!isPushConfigured()) {
      throw new Error('Push notifications are not configured');
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        'pushSubscription': subscription,
        'preferences.notifications.push': true
      }
    });

    return true;
  } catch (error) {
    console.error('Error storing push subscription:', error);
    throw error;
  }
};

// Remove push subscription for a user
const removePushSubscription = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $unset: {
        'pushSubscription': 1
      },
      $set: {
        'preferences.notifications.push': false
      }
    });

    return true;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    throw error;
  }
};

// Send push notification to a single user
const sendPushNotification = async (userId, payload) => {
  try {
    if (!isPushConfigured()) {
      console.log('Push notifications not configured, skipping...');
      return false;
    }

    const user = await User.findById(userId);
    if (!user || !user.pushSubscription) {
      console.log('User has no push subscription');
      return false;
    }

    // Check user preferences
    if (!user.preferences?.notifications?.push) {
      console.log('User has disabled push notifications');
      return false;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'ABY Productivity',
      body: payload.body || payload.message,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: {
        url: payload.url || '/',
        timestamp: new Date().toISOString(),
        ...payload.data
      },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false
    });

    await webpush.sendNotification(user.pushSubscription, notificationPayload);
    console.log(`Push notification sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410) {
      await removePushSubscription(userId);
      console.log(`Removed invalid push subscription for user ${userId}`);
    }
    
    return false;
  }
};

// Send push notification to multiple users
const sendBulkPushNotifications = async (userIds, payload) => {
  try {
    if (!isPushConfigured()) {
      console.log('Push notifications not configured, skipping bulk send...');
      return { success: 0, failed: userIds.length };
    }

    const results = await Promise.allSettled(
      userIds.map(userId => sendPushNotification(userId, payload))
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    const failed = results.length - successful;

    console.log(`Bulk push notifications: ${successful} successful, ${failed} failed`);
    
    return { success: successful, failed };
  } catch (error) {
    console.error('Error sending bulk push notifications:', error);
    return { success: 0, failed: userIds.length };
  }
};

// Send notification based on type
const sendNotificationByType = async (userId, type, data = {}) => {
  const notificationTemplates = {
    task_due: {
      title: 'Task Due Soon',
      body: `"${data.taskTitle}" is due in ${data.timeRemaining}`,
      icon: '/icons/task-due.png',
      url: '/tasks',
      requireInteraction: true
    },
    task_overdue: {
      title: 'Task Overdue',
      body: `"${data.taskTitle}" is ${data.overdueDays} day(s) overdue`,
      icon: '/icons/task-overdue.png',
      url: '/tasks',
      requireInteraction: true
    },
    challenge_started: {
      title: 'New Challenge Available',
      body: `"${data.challengeTitle}" has started!`,
      icon: '/icons/challenge.png',
      url: '/challenges'
    },
    achievement_unlocked: {
      title: 'Achievement Unlocked!',
      body: `You've earned the "${data.achievementTitle}" badge`,
      icon: '/icons/achievement.png',
      url: '/achievements'
    },
    weekly_summary: {
      title: 'Your Weekly Summary',
      body: `You completed ${data.completedTasks} tasks this week`,
      icon: '/icons/summary.png',
      url: '/analytics'
    },
    streak_milestone: {
      title: 'Streak Milestone!',
      body: `Congratulations on your ${data.streakDays}-day streak!`,
      icon: '/icons/streak.png',
      url: '/dashboard'
    },
    productivity_insight: {
      title: 'Productivity Insight',
      body: data.message || 'Check out your latest productivity insights',
      icon: '/icons/insight.png',
      url: '/analytics'
    }
  };

  const template = notificationTemplates[type];
  if (!template) {
    console.error(`Unknown notification type: ${type}`);
    return false;
  }

  return await sendPushNotification(userId, template);
};

// Schedule a push notification
const schedulePushNotification = (userId, payload, delay) => {
  setTimeout(async () => {
    await sendPushNotification(userId, payload);
  }, delay);
};

// Get push notification statistics
const getPushStats = async () => {
  try {
    const totalSubscriptions = await User.countDocuments({
      'pushSubscription': { $exists: true }
    });

    const activeSubscriptions = await User.countDocuments({
      'pushSubscription': { $exists: true },
      'preferences.notifications.push': true
    });

    return {
      totalSubscriptions,
      activeSubscriptions,
      configured: isPushConfigured()
    };
  } catch (error) {
    console.error('Error getting push stats:', error);
    return {
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      configured: isPushConfigured()
    };
  }
};

// Test push notification
const sendTestNotification = async (userId) => {
  const payload = {
    title: 'Test Notification',
    body: 'This is a test push notification from ABY Productivity',
    icon: '/icon-192x192.png',
    url: '/dashboard',
    data: {
      test: true
    }
  };

  return await sendPushNotification(userId, payload);
};

// Clean up invalid subscriptions
const cleanupInvalidSubscriptions = async () => {
  try {
    if (!isPushConfigured()) {
      return { removed: 0 };
    }

    const users = await User.find({
      'pushSubscription': { $exists: true }
    });

    let removed = 0;

    for (const user of users) {
      try {
        // Try to send a test notification
        const testPayload = JSON.stringify({
          title: 'Connection Test',
          body: 'Testing subscription validity',
          silent: true
        });

        await webpush.sendNotification(user.pushSubscription, testPayload);
      } catch (error) {
        if (error.statusCode === 410) {
          // Subscription is invalid, remove it
          await removePushSubscription(user._id);
          removed++;
        }
      }
    }

    console.log(`Cleaned up ${removed} invalid push subscriptions`);
    return { removed };
  } catch (error) {
    console.error('Error cleaning up subscriptions:', error);
    return { removed: 0 };
  }
};

// Generate VAPID keys (for setup)
const generateVapidKeys = () => {
  if (!webpush.generateVAPIDKeys) {
    console.error('VAPID key generation not available');
    return null;
  }
  
  return webpush.generateVAPIDKeys();
};

module.exports = {
  isPushConfigured,
  storePushSubscription,
  removePushSubscription,
  sendPushNotification,
  sendBulkPushNotifications,
  sendNotificationByType,
  schedulePushNotification,
  getPushStats,
  sendTestNotification,
  cleanupInvalidSubscriptions,
  generateVapidKeys
}; 