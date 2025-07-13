const Task = require('../models/Task');
const AIUsage = require('../models/AIUsage');
const User = require('../models/User');
const cron = require('node-cron');

// Get retention settings from environment
const ANALYTICS_RETENTION_DAYS = parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90;
const ANALYTICS_ENABLED = process.env.ANALYTICS_ENABLED !== 'false';

// Clean up old analytics data
const cleanupOldAnalytics = async () => {
  try {
    if (!ANALYTICS_ENABLED) {
      console.log('Analytics disabled, skipping cleanup');
      return { success: false, reason: 'Analytics disabled' };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ANALYTICS_RETENTION_DAYS);

    console.log(`Starting analytics cleanup for data older than ${cutoffDate.toISOString()}`);

    // Clean up old AI usage records
    const aiUsageResult = await AIUsage.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    // Clean up old task analytics (keep tasks but remove detailed analytics)
    const taskUpdateResult = await Task.updateMany(
      { 
        'analytics.lastUpdated': { $lt: cutoffDate }
      },
      {
        $unset: {
          'analytics.timeSpent': 1,
          'analytics.focusSessions': 1,
          'analytics.distractions': 1,
          'analytics.productivityScore': 1
        }
      }
    );

    // Clean up old notification logs (if we had them)
    // This would be implemented if we stored notification history

    const result = {
      success: true,
      aiUsageDeleted: aiUsageResult.deletedCount,
      tasksUpdated: taskUpdateResult.modifiedCount,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: ANALYTICS_RETENTION_DAYS
    };

    console.log('Analytics cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('Error during analytics cleanup:', error);
    return { 
      success: false, 
      error: error.message,
      retentionDays: ANALYTICS_RETENTION_DAYS
    };
  }
};

// Clean up inactive user data
const cleanupInactiveUsers = async () => {
  try {
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(inactivityThreshold.getDate() - 365); // 1 year

    // Find users who haven't logged in for over a year
    const inactiveUsers = await User.find({
      lastLoginAt: { $lt: inactivityThreshold },
      isActive: true
    });

    console.log(`Found ${inactiveUsers.length} inactive users`);

    // Mark users as inactive (don't delete, just deactivate)
    const deactivationResult = await User.updateMany(
      {
        lastLoginAt: { $lt: inactivityThreshold },
        isActive: true
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'inactivity'
        }
      }
    );

    return {
      success: true,
      usersDeactivated: deactivationResult.modifiedCount,
      threshold: inactivityThreshold.toISOString()
    };
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
    return { success: false, error: error.message };
  }
};

// Archive old completed tasks
const archiveOldTasks = async () => {
  try {
    const archiveThreshold = new Date();
    archiveThreshold.setDate(archiveThreshold.getDate() - 180); // 6 months

    // Find old completed tasks
    const tasksToArchive = await Task.find({
      status: 'completed',
      completedAt: { $lt: archiveThreshold },
      archived: { $ne: true }
    });

    console.log(`Found ${tasksToArchive.length} tasks to archive`);

    // Mark tasks as archived
    const archiveResult = await Task.updateMany(
      {
        status: 'completed',
        completedAt: { $lt: archiveThreshold },
        archived: { $ne: true }
      },
      {
        $set: {
          archived: true,
          archivedAt: new Date()
        }
      }
    );

    return {
      success: true,
      tasksArchived: archiveResult.modifiedCount,
      threshold: archiveThreshold.toISOString()
    };
  } catch (error) {
    console.error('Error archiving old tasks:', error);
    return { success: false, error: error.message };
  }
};

// Get data retention statistics
const getRetentionStats = async () => {
  try {
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ANALYTICS_RETENTION_DAYS);

    const stats = {
      retentionSettings: {
        enabled: ANALYTICS_ENABLED,
        retentionDays: ANALYTICS_RETENTION_DAYS,
        cutoffDate: cutoffDate.toISOString()
      },
      dataStats: {
        totalAIUsage: await AIUsage.countDocuments(),
        oldAIUsage: await AIUsage.countDocuments({ timestamp: { $lt: cutoffDate } }),
        totalTasks: await Task.countDocuments(),
        archivedTasks: await Task.countDocuments({ archived: true }),
        activeUsers: await User.countDocuments({ isActive: true }),
        inactiveUsers: await User.countDocuments({ isActive: false })
      }
    };

    return stats;
  } catch (error) {
    console.error('Error getting retention stats:', error);
    return { error: error.message };
  }
};

// Full cleanup routine
const performFullCleanup = async () => {
  try {
    console.log('Starting full data retention cleanup...');

    const results = {
      timestamp: new Date().toISOString(),
      analytics: await cleanupOldAnalytics(),
      inactiveUsers: await cleanupInactiveUsers(),
      archivedTasks: await archiveOldTasks()
    };

    console.log('Full cleanup completed:', results);
    return results;
  } catch (error) {
    console.error('Error during full cleanup:', error);
    return { error: error.message };
  }
};

// Export old data for backup before deletion
const exportOldData = async (days = ANALYTICS_RETENTION_DAYS) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get old AI usage data
    const oldAIUsage = await AIUsage.find({
      timestamp: { $lt: cutoffDate }
    }).populate('userId', 'name email');

    // Get old task analytics
    const oldTaskAnalytics = await Task.find({
      'analytics.lastUpdated': { $lt: cutoffDate }
    }).select('title userId analytics createdAt completedAt');

    const exportData = {
      exportDate: new Date().toISOString(),
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: days,
      data: {
        aiUsage: oldAIUsage,
        taskAnalytics: oldTaskAnalytics
      },
      summary: {
        aiUsageRecords: oldAIUsage.length,
        taskAnalyticsRecords: oldTaskAnalytics.length
      }
    };

    return exportData;
  } catch (error) {
    console.error('Error exporting old data:', error);
    return { error: error.message };
  }
};

// Schedule automatic cleanup (runs daily at 2 AM)
const scheduleCleanup = () => {
  if (!ANALYTICS_ENABLED) {
    console.log('Analytics disabled, not scheduling cleanup');
    return;
  }

  // Daily cleanup at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled data retention cleanup...');
    await performFullCleanup();
  });

  // Weekly inactive user cleanup (Sundays at 3 AM)
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running weekly inactive user cleanup...');
    await cleanupInactiveUsers();
  });

  // Monthly task archival (1st of month at 4 AM)
  cron.schedule('0 4 1 * *', async () => {
    console.log('Running monthly task archival...');
    await archiveOldTasks();
  });

  console.log(`Data retention scheduled: cleanup every day at 2 AM, retention period: ${ANALYTICS_RETENTION_DAYS} days`);
};

// Initialize data retention service
const initializeDataRetention = () => {
  console.log('Initializing data retention service...');
  console.log(`Analytics enabled: ${ANALYTICS_ENABLED}`);
  console.log(`Retention period: ${ANALYTICS_RETENTION_DAYS} days`);
  
  if (ANALYTICS_ENABLED) {
    scheduleCleanup();
  }
};

module.exports = {
  cleanupOldAnalytics,
  cleanupInactiveUsers,
  archiveOldTasks,
  getRetentionStats,
  performFullCleanup,
  exportOldData,
  scheduleCleanup,
  initializeDataRetention,
  ANALYTICS_RETENTION_DAYS,
  ANALYTICS_ENABLED
}; 