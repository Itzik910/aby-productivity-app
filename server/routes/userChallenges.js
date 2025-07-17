const express = require('express');
const router = express.Router();
const UserChallenge = require('../models/UserChallenge');
const { auth } = require('../middleware/auth');

// Get all user challenges
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, type } = req.query;
    const query = { user: req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;

    const challenges = await UserChallenge.find(query)
      .sort({ createdAt: -1 })
      .populate('linkedTasks', 'title status');

    res.json({
      success: true,
      challenges
    });
  } catch (error) {
    console.error('Error fetching user challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
});

// Create new user challenge
router.post('/', auth, async (req, res) => {
  try {
    const challengeData = {
      ...req.body,
      user: req.user.id
    };

    const challenge = new UserChallenge(challengeData);
    await challenge.save();

    res.status(201).json({
      success: true,
      challenge
    });
  } catch (error) {
    console.error('Error creating user challenge:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create challenge'
    });
  }
});

// Get single challenge
router.get('/:id', auth, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('linkedTasks');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      challenge
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenge'
    });
  }
});

// Update challenge progress
router.post('/:id/progress', auth, async (req, res) => {
  try {
    const { value, notes } = req.body;
    
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    await challenge.updateProgress(value, notes);

    res.json({
      success: true,
      challenge
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update progress'
    });
  }
});

// Update challenge
router.put('/:id', auth, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      challenge
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update challenge'
    });
  }
});

// Delete challenge
router.delete('/:id', auth, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete challenge'
    });
  }
});

// Get challenge statistics
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const challenge = await UserChallenge.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const stats = {
      progress: challenge.progress,
      analytics: challenge.analytics,
      daysRemaining: challenge.daysRemaining,
      milestones: challenge.milestones,
      checkInsThisWeek: challenge.progress.checkIns.filter(checkIn => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(checkIn.date) >= weekAgo;
      }).length
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching challenge stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

module.exports = router; 