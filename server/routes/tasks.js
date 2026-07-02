const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const AIUsage = require('../models/AIUsage');
const { auth } = require('../middleware/auth');
const { aiService } = require('../services/aiService');

// Get all tasks for user with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      startDate,
      endDate,
      search,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    const query = { user: req.user.id };

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('collaborators.user', 'name email avatar')
      .populate('challenge', 'title sponsor points')
      .exec();

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    })
      .populate('collaborators.user', 'name email avatar')
      .populate('challenge', 'title sponsor points');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', auth, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      user: req.user.id
    };

    const task = new Task(taskData);
    await task.save();

    // Generate AI suggestions if user has premium or free usage left
    const user = await User.findById(req.user.id);
    if (user.premium?.isPremium || user.aiUsage?.dailyUsage < 5) {
      try {
        const suggestions = await aiService.generateTaskSuggestions(task, user);
        task.aiSuggestions = suggestions.map(suggestion => ({
          suggestion,
          type: 'completion',
          confidence: 0.8
        }));
        await task.save();

        // Track AI usage
        await AIUsage.create({
          user: req.user.id,
          endpoint: 'task-suggestions',
          tokensUsed: 150, // Estimated
          success: true
        });
      } catch (aiError) {
        console.error('AI suggestion error:', aiError);
      }
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...req.body, 'sync.lastModified': new Date() },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete task
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.progress.percentage = 100;
    
    // Add completion check-in
    task.progress.checkIns.push({
      status: 'completed',
      notes: req.body.notes || '',
      mood: req.body.mood || 'good'
    });

    await task.save();

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.tasksCompleted': 1 }
    });

    res.json(task);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add task step
router.post('/:id/steps', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.addStep(req.body);
    res.json(task);
  } catch (error) {
    console.error('Error adding step:', error);
    res.status(400).json({ message: error.message });
  }
});

// Complete task step
router.patch('/:id/steps/:stepIndex/complete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await task.completeStep(parseInt(req.params.stepIndex));
    res.json(task);
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get location-based tasks
router.get('/location/nearby', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const tasks = await Task.findNearby([parseFloat(lng), parseFloat(lat)], parseInt(radius));
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching nearby tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overdue tasks
router.get('/status/overdue', auth, async (req, res) => {
  try {
    const tasks = await Task.findOverdue(req.user.id);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task analytics
router.get('/analytics/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateQuery = {};
    
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const matchQuery = { user: req.user.id };
    if (Object.keys(dateQuery).length > 0) {
      matchQuery.createdAt = dateQuery;
    }

    const analytics = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'pending'] },
                    { $lt: ['$dueDate', new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgCompletionTime: { $avg: '$actualDuration' },
          totalTimeSpent: { $sum: '$analytics.timeSpent' },
          categoryBreakdown: {
            $push: '$category'
          },
          priorityBreakdown: {
            $push: '$priority'
          }
        }
      }
    ]);

    const result = analytics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      avgCompletionTime: 0,
      totalTimeSpent: 0,
      categoryBreakdown: [],
      priorityBreakdown: []
    };

    // Calculate completion rate
    result.completionRate = result.totalTasks > 0 
      ? Math.round((result.completedTasks / result.totalTasks) * 100)
      : 0;

    res.json(result);
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request AI suggestions for existing task
router.post('/:id/ai-suggestions', auth, async (req, res) => {
  const startTime = Date.now();
  let aiUsageData = null;
  
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const user = await User.findById(req.user.id);
    
    // Check if user has AI usage available
    if (!user.premium?.isPremium && user.aiUsage?.dailyUsage >= 5) {
      return res.status(403).json({ message: 'AI usage limit reached. Upgrade to premium for unlimited access.' });
    }

    // Generate suggestions with proper usage tracking
    const result = await aiService.generateTaskSuggestionsWithUsage(task, user);
    const responseTime = Date.now() - startTime;
    
    // Add suggestions to task (convert structured suggestions to task format)
    const newSuggestions = result.suggestions.map(suggestion => ({
      suggestion: suggestion.header, // Store the header as the main suggestion
      type: suggestion.type,
      confidence: 0.8
    }));

    task.aiSuggestions.push(...newSuggestions);
    await task.save();

    // Track AI usage only if we have valid usage data
    if (result.usageData) {
      try {
        aiUsageData = {
          user: req.user.id,
          requestType: 'task_suggestion',
          input: {
            taskTitle: task.title,
            taskDescription: task.description
          },
          response: {
            suggestions: newSuggestions.map(s => ({
              text: s.suggestion,
              type: s.type,
              confidence: s.confidence
            }))
          },
          tokens: {
            input: result.usageData.inputTokens || 0,
            output: result.usageData.outputTokens || 0,
            total: result.usageData.totalTokens || 0
          },
          performance: {
            responseTime,
            errorOccurred: result.usageData.error || false,
            errorMessage: result.usageData.errorMessage
          },
          model: {
            name: result.usageData.model || 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
          }
        };

        await AIUsage.create(aiUsageData);
      } catch (usageError) {
        console.error('Error tracking AI usage:', usageError);
        // Don't fail the request if usage tracking fails
      }
    }

    // Update user AI usage counter
    if (!user.premium?.isPremium) {
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { 'aiUsage.dailyUsage': 1 }
      });
    }

    // Return the structured suggestions to the frontend
    res.json(result.suggestions);
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    
    // Track failed request if we have timing data
    if (aiUsageData === null) {
      try {
        await AIUsage.create({
          user: req.user.id,
          requestType: 'task_suggestion',
          tokens: {
            input: 0,
            output: 0,
            total: 0
          },
          performance: {
            responseTime: Date.now() - startTime,
            errorOccurred: true,
            errorMessage: error.message
          },
          model: {
            name: 'gpt-4',
            temperature: 0.7,
            maxTokens: 1000
          }
        });
      } catch (usageError) {
        console.error('Error tracking failed AI usage:', usageError);
      }
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Select AI suggestion
router.patch('/:id/ai-suggestions/:suggestionId/select', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const suggestion = task.aiSuggestions.id(req.params.suggestionId);
    if (!suggestion) {
      return res.status(404).json({ message: 'Suggestion not found' });
    }

    suggestion.isSelected = true;
    suggestion.selectedAt = new Date();
    await task.save();

    res.json(suggestion);
  } catch (error) {
    console.error('Error selecting suggestion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk operations
router.post('/bulk/complete', auth, async (req, res) => {
  try {
    const { taskIds } = req.body;
    
    const result = await Task.updateMany(
      {
        _id: { $in: taskIds },
        user: req.user.id
      },
      {
        status: 'completed',
        completedAt: new Date(),
        'progress.percentage': 100
      }
    );

    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.tasksCompleted': result.modifiedCount }
    });

    res.json({ message: `${result.modifiedCount} tasks completed` });
  } catch (error) {
    console.error('Error bulk completing tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /tasks/:id/five-ways
// @desc    Generate 5 ways to complete a task with step-by-step instructions
// @access  Private
router.get('/:id/five-ways', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const user = await User.findById(req.user.id);
    const ways = await aiService.generateFiveWays(task, user);

    res.json({ success: true, ways });
  } catch (error) {
    console.error('Error generating five ways:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
