const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const AIUsage = require('../models/AIUsage');
const { auth } = require('../middleware/auth');
const { checkAIUsageLimit } = require('../middleware/aiLimits');
const { aiService } = require('../services/aiService');
const { spawnNextOccurrence } = require('../services/recurringTaskService');
const { extractAndSavePreferences } = require('../services/preferenceExtractor');

// Build a compact user-profile context string to inject into the AI parser.
function buildUserContext(user) {
  if (!user) return '';
  const p = user.dynamicPreferences || {};
  const parts = [];
  const city = p.city || user.location?.city;
  if (city) parts.push(`City: ${city}`);
  if (p.sports?.length) parts.push(`Likes Sports: ${p.sports.join(', ')}`);
  if (p.dislikedSports?.length) parts.push(`Dislikes Sports: ${p.dislikedSports.join(', ')}`);
  const dietary = [...(p.dietary || []), ...(user.profile?.dietaryRestrictions || [])];
  if (dietary.length) parts.push(`Dietary: ${[...new Set(dietary)].join(', ')}`);
  if (p.preferredBrands?.length) parts.push(`Preferred Brands: ${p.preferredBrands.join(', ')}`);
  if (p.generalNotes?.length) parts.push(`Notes: ${p.generalNotes.join('; ')}`);
  return parts.length ? `User Profile Context: ${parts.join(' | ')}` : '';
}

// POST /api/tasks/ai-parse  (Server-Sent Events)
// Parses a free-text prompt into structured tasks, streaming progress updates.
router.post('/ai-parse', auth, checkAIUsageLimit, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    const prompt = (req.body && req.body.prompt ? String(req.body.prompt) : '').trim();
    if (!prompt) {
      send('error', { message: 'Prompt is required' });
      return res.end();
    }

    // Fire-and-forget: learn preferences from this prompt without blocking the stream.
    extractAndSavePreferences(prompt, req.user._id).catch((err) =>
      console.error('extractAndSavePreferences (background) failed:', err.message)
    );

    // Inject dynamic user context so the AI tailors recommendations.
    const userContext = buildUserContext(req.user);

    send('progress', { message: 'מעבד משימות...' });

    const parsed = await aiService.streamParseTasks(
      prompt,
      (event, message) => send(event, { message }),
      userContext
    );

    if (!parsed.length) {
      send('error', { message: 'לא נמצאו משימות בטקסט' });
      return res.end();
    }

    // Persist parsed tasks with status 'open' and displayOnMain true before success.
    const now = new Date();
    const defaultDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const saved = await Task.insertMany(
      parsed.map((t) => ({
        ...t,
        user: req.user._id,
        status: 'open',
        displayOnMain: true,
        dueDate: t.dueDate ? new Date(t.dueDate) : defaultDueDate
      }))
    );

    send('success', { tasks: saved });
    return res.end();
  } catch (error) {
    console.error('ai-parse SSE error:', error.message);
    send('error', { message: error.message || 'Failed to parse tasks' });
    return res.end();
  }
});

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

    // Spawn next occurrence for recurring tasks
    if (task.isRecurring) {
      spawnNextOccurrence(task).catch((err) =>
        console.error('[RECURRING] Failed to spawn next occurrence:', err)
      );
    }

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

// ─── Steps / Checklist ────────────────────────────────────────────────────────

// @route   POST /tasks/:id/steps
// @desc    Add a step to a task
// @access  Private
router.post('/:id/steps', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Step title is required' });
    await task.addStep({ title, description });
    res.json({ success: true, steps: task.steps });
  } catch (error) {
    console.error('Error adding step:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /tasks/:id/steps/:stepIndex/complete
// @desc    Mark a step as completed
// @access  Private
router.patch('/:id/steps/:stepIndex/complete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    await task.completeStep(Number(req.params.stepIndex));
    res.json({ success: true, steps: task.steps, progress: task.progress });
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// @route   PATCH /tasks/:id/steps/:stepIndex/uncomplete
// @desc    Unmark a step (toggle off)
// @access  Private
router.patch('/:id/steps/:stepIndex/uncomplete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const idx = Number(req.params.stepIndex);
    if (!task.steps[idx]) return res.status(404).json({ message: 'Step not found' });
    task.steps[idx].isCompleted = false;
    task.steps[idx].completedAt = undefined;
    await task.save();
    res.json({ success: true, steps: task.steps, progress: task.progress });
  } catch (error) {
    console.error('Error uncompleting step:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /tasks/:id/steps/:stepIndex
// @desc    Delete a step from a task
// @access  Private
router.delete('/:id/steps/:stepIndex', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const idx = Number(req.params.stepIndex);
    if (!task.steps[idx]) return res.status(404).json({ message: 'Step not found' });
    task.steps.splice(idx, 1);
    task.steps.forEach((s, i) => { s.order = i + 1; });
    await task.save();
    res.json({ success: true, steps: task.steps, progress: task.progress });
  } catch (error) {
    console.error('Error deleting step:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Collaborators / Sharing ──────────────────────────────────────────────────

// @route   POST /tasks/:id/collaborators
// @desc    Invite a collaborator by email
// @access  Private
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });
    if (!['viewer', 'editor'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) return res.status(404).json({ message: 'User with that email not found' });
    if (String(invitee._id) === String(req.user.id)) return res.status(400).json({ message: 'Cannot invite yourself' });

    const alreadyAdded = task.collaborators.some(
      (c) => String(c.user) === String(invitee._id)
    );
    if (alreadyAdded) return res.status(400).json({ message: 'Already a collaborator' });

    task.collaborators.push({ user: invitee._id, role, invitedAt: new Date() });
    await task.save();

    res.json({ success: true, collaborators: task.collaborators, collaboratorName: invitee.name });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /tasks/:id/collaborators/:userId
// @desc    Remove a collaborator
// @access  Private (task owner only)
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.collaborators = task.collaborators.filter(
      (c) => String(c.user) !== req.params.userId
    );
    await task.save();
    res.json({ success: true, collaborators: task.collaborators });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /tasks/shared
// @desc    Get tasks shared with the current user (as a collaborator)
// @access  Private
router.get('/shared', auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      'collaborators.user': req.user.id,
      status: { $ne: 'cancelled' },
    })
      .populate('user', 'name email avatar')
      .sort({ dueDate: 1 })
      .limit(50);
    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Error fetching shared tasks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /tasks/nlp-parse
// @desc    Parse a natural language string into structured task fields using AI
// @access  Private
router.post('/nlp-parse', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'text is required' });
    }

    const { aiService: ai } = require('../services/aiService');
    const result = await ai.parseNaturalLanguageTask(text);
    res.json({ success: true, parsed: result });
  } catch (error) {
    console.error('Error parsing NLP task:', error);
    res.status(500).json({ success: false, message: 'Failed to parse task' });
  }
});

// @route   POST /tasks/plan-my-day
// @desc    Use AI to generate an optimized schedule for today's pending tasks
// @access  Private
router.post('/plan-my-day', auth, async (req, res) => {
  try {
    const [tasks, user] = await Promise.all([
      Task.find({ user: req.user.id, status: 'pending' }).sort({ priority: -1, dueDate: 1 }).limit(20),
      User.findById(req.user.id),
    ]);

    if (tasks.length === 0) {
      return res.json({ success: true, schedule: [], morningBriefing: "You're all caught up! No pending tasks for today." });
    }

    const result = await aiService.planMyDay(tasks, user);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in plan-my-day:', error);
    res.status(500).json({ success: false, message: 'Failed to plan your day' });
  }
});

// @route   POST /tasks/:id/breakdown
// @desc    Use AI to break a task into subtasks and add them as steps
// @access  Private
router.post('/:id/breakdown', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const steps = await aiService.breakdownTaskToSteps(task);

    task.steps = [];
    steps.forEach(({ title, description }, i) => {
      task.steps.push({ title, description: description || '', order: i + 1, isCompleted: false });
    });
    await task.save();

    res.json({ success: true, steps: task.steps, progress: task.progress });
  } catch (error) {
    console.error('Error breaking down task:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /tasks/:id/steps/:stepIndex/hint
// @desc    Get a short AI hint for a specific step (inline dropdown)
// @access  Private
router.post('/:id/steps/:stepIndex/hint', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const idx = Number(req.params.stepIndex);
    const step = task.steps[idx];
    if (!step) return res.status(404).json({ message: 'Step not found' });

    const hint = await aiService.getStepHint(task, step);
    res.json({ success: true, hint });
  } catch (error) {
    console.error('Error getting step hint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
