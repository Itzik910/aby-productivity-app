const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');

// Get all active challenges
router.get('/challenges', async (req, res) => {
  try {
    const {
      category,
      difficulty,
      featured,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isPublic: true, status: { $in: ['published', 'active'] } };

    // Apply filters
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (featured === 'true') query.isFeatured = true;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const challenges = await Challenge.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .select('-participants') // Exclude participants for performance
      .exec();

    const total = await Challenge.countDocuments(query);

    res.json({
      challenges,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get featured challenges
router.get('/challenges/featured', async (req, res) => {
  try {
    const challenges = await Challenge.findFeatured()
      .limit(6)
      .select('-participants');
    
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching featured challenges:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get challenges by category
router.get('/challenges/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const challenges = await Challenge.findByCategory(category)
      .limit(limit * 1)
      .select('-participants');

    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single challenge details
router.get('/challenges/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email avatar');

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    // Increment view count
    challenge.analytics.views += 1;
    await challenge.save();

    res.json(challenge);
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join a challenge
router.post('/challenges/:id/join', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (!challenge.canRegister) {
      return res.status(400).json({ message: 'Challenge registration is closed' });
    }

    await challenge.addParticipant(req.user.id);

    // Create initial tasks for the user
    const challengeTasks = challenge.tasks.map(task => ({
      title: task.title,
      description: task.description,
      user: req.user.id,
      category: task.category || challenge.category,
      priority: 'medium',
      dueDate: task.dueDate || challenge.endDate,
      estimatedDuration: task.estimatedDuration,
      challenge: challenge._id,
      sponsorPoints: task.points,
      status: 'pending'
    }));

    await Task.insertMany(challengeTasks);

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.challengesJoined': 1 }
    });

    res.json({ message: 'Successfully joined challenge!' });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(400).json({ message: error.message });
  }
});

// Leave a challenge
router.post('/challenges/:id/leave', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const participantIndex = challenge.participants.findIndex(
      p => p.user.toString() === req.user.id
    );

    if (participantIndex === -1) {
      return res.status(400).json({ message: 'You are not participating in this challenge' });
    }

    challenge.participants[participantIndex].status = 'dropped';
    await challenge.save();

    // Update challenge-related tasks
    await Task.updateMany(
      { user: req.user.id, challenge: challenge._id },
      { status: 'cancelled' }
    );

    res.json({ message: 'Successfully left challenge' });
  } catch (error) {
    console.error('Error leaving challenge:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete a challenge task
router.post('/challenges/:challengeId/tasks/:taskId/complete', auth, async (req, res) => {
  try {
    const { challengeId, taskId } = req.params;
    const { notes } = req.body;

    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const challengeTask = challenge.tasks.find(t => t._id.toString() === taskId);
    if (!challengeTask) {
      return res.status(404).json({ message: 'Challenge task not found' });
    }

    // Update challenge participant progress
    await challenge.updateParticipantProgress(req.user.id, taskId, challengeTask.points);

    // Complete the corresponding user task
    await Task.findOneAndUpdate(
      { user: req.user.id, challenge: challengeId, title: challengeTask.title },
      { 
        status: 'completed', 
        completedAt: new Date(),
        'progress.percentage': 100
      }
    );

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 
        'stats.tasksCompleted': 1,
        'stats.sponsorPoints': challengeTask.points
      }
    });

    res.json({ message: 'Task completed successfully!', pointsEarned: challengeTask.points });
  } catch (error) {
    console.error('Error completing challenge task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's challenge progress
router.get('/challenges/:id/progress', auth, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const participant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(404).json({ message: 'You are not participating in this challenge' });
    }

    // Get user's challenge tasks
    const tasks = await Task.find({
      user: req.user.id,
      challenge: challenge._id
    }).select('title status completedAt progress sponsorPoints');

    res.json({
      participant,
      tasks,
      challenge: {
        title: challenge.title,
        endDate: challenge.endDate,
        totalTasks: challenge.tasks.length
      }
    });
  } catch (error) {
    console.error('Error fetching challenge progress:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get challenge leaderboard
router.get('/challenges/:id/leaderboard', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const challenge = await Challenge.findById(req.params.id)
      .populate('participants.user', 'name email avatar')
      .select('participants title social');

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (!challenge.social.showLeaderboard) {
      return res.status(403).json({ message: 'Leaderboard is not enabled for this challenge' });
    }

    // Sort participants by points earned
    const leaderboard = challenge.participants
      .filter(p => p.status === 'active' || p.status === 'completed')
      .sort((a, b) => b.progress.pointsEarned - a.progress.pointsEarned)
      .slice(0, limit)
      .map((participant, index) => ({
        rank: index + 1,
        user: participant.user,
        pointsEarned: participant.progress.pointsEarned,
        completionRate: participant.progress.completionRate,
        tasksCompleted: participant.progress.tasksCompleted,
        badges: participant.progress.badges,
        status: participant.status
      }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit challenge feedback
router.post('/challenges/:id/feedback', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const participant = challenge.participants.find(
      p => p.user.toString() === req.user.id
    );

    if (!participant) {
      return res.status(400).json({ message: 'You must participate in the challenge to leave feedback' });
    }

    participant.feedback = {
      rating,
      comment,
      submittedAt: new Date()
    };

    await challenge.save();

    // Update challenge analytics
    const ratings = challenge.participants
      .filter(p => p.feedback && p.feedback.rating)
      .map(p => p.feedback.rating);

    if (ratings.length > 0) {
      challenge.analytics.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      await challenge.save();
    }

    res.json({ message: 'Feedback submitted successfully!' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's joined challenges
router.get('/my-challenges', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const matchQuery = {
      'participants.user': req.user.id
    };

    if (status) {
      matchQuery['participants.status'] = status;
    }

    const challenges = await Challenge.find(matchQuery)
      .populate('participants.user', 'name email avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Filter to only show user's participation data
    const userChallenges = challenges.map(challenge => {
      const userParticipation = challenge.participants.find(
        p => p.user._id.toString() === req.user.id
      );

      return {
        ...challenge.toObject(),
        userParticipation,
        participants: undefined // Remove all participants data
      };
    });

    res.json(userChallenges);
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get challenge statistics
router.get('/challenges/:id/stats', async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const stats = {
      totalParticipants: challenge.participants.length,
      activeParticipants: challenge.participants.filter(p => p.status === 'active').length,
      completedParticipants: challenge.participants.filter(p => p.status === 'completed').length,
      averageProgress: challenge.participants.reduce((sum, p) => sum + p.progress.completionRate, 0) / challenge.participants.length || 0,
      totalPointsAwarded: challenge.participants.reduce((sum, p) => sum + p.progress.pointsEarned, 0),
      completionRate: challenge.analytics.completionRate,
      averageRating: challenge.analytics.averageRating,
      views: challenge.analytics.views,
      daysRemaining: Math.max(0, Math.ceil((challenge.endDate - new Date()) / (1000 * 60 * 60 * 24)))
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching challenge stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search challenges
router.get('/challenges/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const challenges = await Challenge.find({
      $and: [
        { isPublic: true },
        { status: { $in: ['published', 'active'] } },
        {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { 'sponsor.name': { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
      .limit(limit * 1)
      .select('-participants')
      .sort({ isFeatured: -1, createdAt: -1 });

    res.json(challenges);
  } catch (error) {
    console.error('Error searching challenges:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 