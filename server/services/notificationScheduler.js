const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');

let _io = null;

function setIo(io) {
  _io = io;
}

/**
 * Helper: persist a notification and push it over Socket.IO if online.
 */
async function notify(userId, type, title, message, data = {}) {
  try {
    const notification = await Notification.createForUser(userId, {
      type,
      title,
      message,
      data,
      priority: data.priority || 'medium',
    });

    if (_io) {
      _io.to(String(userId)).emit('notification', {
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
  } catch (error) {
    console.error('[NOTIF SCHEDULER] Failed to create notification:', error.message);
    return null;
  }
}

/**
 * Tasks due in the next 24 hours — remind user once.
 * Runs every hour.
 */
async function checkUpcomingDeadlines() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      status: 'pending',
      dueDate: { $gte: now, $lte: in24h },
    }).populate('user', '_id name');

    for (const task of tasks) {
      const userId = task.user?._id || task.user;
      // Skip if already notified in last 20 hours
      const recent = await Notification.findOne({
        user: userId,
        type: 'task_due',
        'data.taskId': String(task._id),
        createdAt: { $gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
      });
      if (recent) continue;

      const hoursLeft = Math.round((task.dueDate - now) / (1000 * 60 * 60));
      await notify(
        userId,
        'task_due',
        'Task due soon',
        `"${task.title}" is due in ${hoursLeft < 1 ? 'less than an hour' : `${hoursLeft} hours`}.`,
        { taskId: String(task._id), priority: task.priority }
      );
    }
  } catch (error) {
    console.error('[NOTIF SCHEDULER] checkUpcomingDeadlines error:', error.message);
  }
}

/**
 * Tasks that are overdue — daily reminder.
 * Runs every morning at 8 AM.
 */
async function checkOverdueTasks() {
  try {
    const now = new Date();

    const tasks = await Task.find({
      status: 'pending',
      dueDate: { $lt: now },
    }).populate('user', '_id');

    // Group by user so we send one bundled notification
    const byUser = {};
    for (const task of tasks) {
      const uid = String(task.user?._id || task.user);
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(task);
    }

    for (const [userId, userTasks] of Object.entries(byUser)) {
      await notify(
        userId,
        'task_overdue',
        'Overdue tasks',
        `You have ${userTasks.length} overdue task${userTasks.length !== 1 ? 's' : ''}. ${userTasks[0].title}${userTasks.length > 1 ? ` and ${userTasks.length - 1} more` : ''}.`,
        { count: userTasks.length, priority: 'high' }
      );
    }
  } catch (error) {
    console.error('[NOTIF SCHEDULER] checkOverdueTasks error:', error.message);
  }
}

/**
 * Daily morning briefing — what's on the schedule today.
 * Runs every day at 7 AM.
 */
async function sendDailyBriefing() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Get all users with tasks today
    const todayTasks = await Task.find({
      status: 'pending',
      dueDate: { $gte: todayStart, $lt: todayEnd },
    }).populate('user', '_id name');

    const byUser = {};
    for (const task of todayTasks) {
      const uid = String(task.user?._id || task.user);
      if (!byUser[uid]) byUser[uid] = { name: task.user?.name, tasks: [] };
      byUser[uid].tasks.push(task);
    }

    for (const [userId, { name, tasks }] of Object.entries(byUser)) {
      const urgent = tasks.filter((t) => t.priority === 'urgent').length;
      let msg = `Good morning${name ? ', ' + name : ''}! You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''} today`;
      if (urgent) msg += ` (${urgent} urgent)`;
      msg += `. First up: "${tasks[0].title}".`;

      await notify(userId, 'daily_summary', 'Daily briefing', msg, {
        taskCount: tasks.length,
        urgentCount: urgent,
      });
    }
  } catch (error) {
    console.error('[NOTIF SCHEDULER] sendDailyBriefing error:', error.message);
  }
}

/**
 * Weekly summary — every Sunday at 8 PM.
 */
async function sendWeeklySummary() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const users = await User.find({ isActive: { $ne: false } }).select('_id name stats');
    for (const user of users) {
      const [completed, total] = await Promise.all([
        Task.countDocuments({ user: user._id, status: 'completed', completedAt: { $gte: weekAgo } }),
        Task.countDocuments({ user: user._id, createdAt: { $gte: weekAgo } }),
      ]);
      if (total === 0) continue;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      await notify(
        user._id,
        'weekly_summary',
        'Your weekly summary',
        `This week: completed ${completed} of ${total} tasks (${rate}%). ${
          rate >= 80 ? 'Outstanding work!' : rate >= 50 ? 'Good progress!' : 'Keep going, every step counts!'
        }`,
        { completed, total, rate }
      );
    }
  } catch (error) {
    console.error('[NOTIF SCHEDULER] sendWeeklySummary error:', error.message);
  }
}

function initNotificationScheduler(io) {
  if (io) setIo(io);

  // Check upcoming deadlines every hour
  cron.schedule('0 * * * *', checkUpcomingDeadlines);

  // Daily morning briefing at 7 AM
  cron.schedule('0 7 * * *', sendDailyBriefing);

  // Overdue check at 8 AM daily
  cron.schedule('0 8 * * *', checkOverdueTasks);

  // Weekly summary every Sunday at 8 PM
  cron.schedule('0 20 * * 0', sendWeeklySummary);

  console.log('[NOTIF SCHEDULER] Notification scheduler initialized');
}

module.exports = { initNotificationScheduler, notify };
