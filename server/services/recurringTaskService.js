const Task = require('../models/Task');
const cron = require('node-cron');

/**
 * Calculate the next due date for a recurring task.
 */
function getNextDueDate(baseDate, recurrence) {
  const d = new Date(baseDate);

  switch (recurrence.pattern) {
    case 'daily':
      d.setDate(d.getDate() + recurrence.interval);
      break;
    case 'weekly':
      d.setDate(d.getDate() + recurrence.interval * 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + recurrence.interval);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + recurrence.interval);
      break;
    default:
      d.setDate(d.getDate() + 1);
  }

  return d;
}

/**
 * Spawn the next occurrence of a recurring task.
 */
async function spawnNextOccurrence(completedTask) {
  try {
    if (!completedTask.isRecurring || !completedTask.recurrence?.pattern) {
      return null;
    }

    const nextDueDate = getNextDueDate(completedTask.dueDate, completedTask.recurrence);

    // Respect the recurrence end date
    if (completedTask.recurrence.endDate && nextDueDate > new Date(completedTask.recurrence.endDate)) {
      return null;
    }

    const nextTask = new Task({
      title: completedTask.title,
      description: completedTask.description,
      user: completedTask.user,
      category: completedTask.category,
      priority: completedTask.priority,
      dueDate: nextDueDate,
      estimatedDuration: completedTask.estimatedDuration,
      tags: completedTask.tags,
      location: completedTask.location,
      isRecurring: true,
      recurrence: completedTask.recurrence,
      steps: completedTask.steps.map(({ title, description, order }) => ({
        title,
        description,
        order,
        isCompleted: false,
      })),
    });

    await nextTask.save();
    console.log(`[RECURRING] Spawned next occurrence: ${nextTask._id} for task "${completedTask.title}"`);
    return nextTask;
  } catch (error) {
    console.error('[RECURRING] Error spawning next occurrence:', error);
    return null;
  }
}

/**
 * Daily cron job that checks for recurring tasks that were completed
 * but don't yet have a next occurrence.
 */
function initRecurringTaskScheduler() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[RECURRING] Running daily recurring task check...');
    try {
      const recurringCompleted = await Task.find({
        isRecurring: true,
        status: 'completed',
      });

      for (const task of recurringCompleted) {
        const alreadySpawned = await Task.findOne({
          user: task.user,
          title: task.title,
          isRecurring: true,
          status: 'pending',
          dueDate: { $gt: task.dueDate },
        });

        if (!alreadySpawned) {
          await spawnNextOccurrence(task);
        }
      }
    } catch (error) {
      console.error('[RECURRING] Scheduler error:', error);
    }
  });

  console.log('[RECURRING] Recurring task scheduler initialized (runs daily at 2 AM)');
}

module.exports = { spawnNextOccurrence, initRecurringTaskScheduler, getNextDueDate };
