const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'task_due',
      'task_overdue',
      'challenge_started',
      'challenge_completed',
      'streak_milestone',
      'productivity_insight',
      'weekly_summary',
      'daily_summary',
      'achievement_unlocked',
      'reminder',
      'task_shared',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
}, {
  timestamps: true,
});

// Keep at most 200 per user (TTL not ideal here since we want user control)
notificationSchema.index({ user: 1, createdAt: -1 });

// Static method: create and trim to 200 per user
notificationSchema.statics.createForUser = async function(userId, data) {
  const notification = await this.create({ user: userId, ...data });

  // Trim to 200 most recent
  const total = await this.countDocuments({ user: userId });
  if (total > 200) {
    const oldest = await this.find({ user: userId })
      .sort({ createdAt: 1 })
      .limit(total - 200)
      .select('_id');
    await this.deleteMany({ _id: { $in: oldest.map((n) => n._id) } });
  }

  return notification;
};

module.exports = mongoose.model('Notification', notificationSchema);
