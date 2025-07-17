const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   POST /api/fix-my-day
// @desc    Generate optimized route for completing tasks
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { currentLocation, isWeekend } = req.body;
    const userId = req.user.id;

    // Get user with addresses
    const user = await User.findById(userId);
    
    if (!user.addresses?.home || !user.addresses?.work) {
      return res.status(400).json({
        success: false,
        message: 'Please set your home and work addresses in your profile first'
      });
    }

    // Get pending tasks with locations
    const tasks = await Task.find({
      user: userId,
      status: { $in: ['pending', 'in_progress'] },
      'location.name': { $exists: true, $ne: '' }
    }).sort({ priority: -1, dueDate: 1 });

    if (tasks.length === 0) {
      return res.json({
        success: true,
        message: 'No location-based tasks to optimize',
        route: []
      });
    }

    // Determine start and end points based on day
    let startPoint, endPoint;
    
    if (isWeekend) {
      // Weekend: start from current location, end at home
      startPoint = currentLocation || user.addresses.home;
      endPoint = user.addresses.home;
    } else {
      // Weekday: start from home, end at work (or reverse if after work hours)
      const hour = new Date().getHours();
      if (hour < 12) {
        // Morning: home to work
        startPoint = user.addresses.home;
        endPoint = user.addresses.work;
      } else if (hour < 17) {
        // Afternoon: around work area
        startPoint = user.addresses.work;
        endPoint = user.addresses.work;
      } else {
        // Evening: work to home
        startPoint = user.addresses.work;
        endPoint = user.addresses.home;
      }
    }

    // Group tasks by location proximity (simple version without actual Google Maps)
    // In production, you would use Google Maps Distance Matrix API
    const optimizedRoute = optimizeTaskRoute(tasks, startPoint, endPoint);

    // Calculate estimated time
    const estimatedTime = calculateEstimatedTime(optimizedRoute);

    res.json({
      success: true,
      data: {
        startPoint,
        endPoint,
        tasks: optimizedRoute,
        estimatedTime,
        totalTasks: optimizedRoute.length,
        suggestions: generateSuggestions(optimizedRoute, estimatedTime)
      }
    });
  } catch (error) {
    console.error('Error in Fix My Day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate route optimization'
    });
  }
});

// Helper function to optimize route (simplified version)
function optimizeTaskRoute(tasks, startPoint, endPoint) {
  // In a real implementation, this would use Google Maps API
  // For now, we'll sort by priority and group by general area
  
  const priorityWeight = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  return tasks
    .sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .map(task => ({
      _id: task._id,
      title: task.title,
      location: task.location,
      estimatedDuration: task.estimatedDuration || 30,
      priority: task.priority,
      dueDate: task.dueDate,
      category: task.category
    }));
}

// Calculate estimated time for route
function calculateEstimatedTime(tasks) {
  const taskTime = tasks.reduce((total, task) => total + (task.estimatedDuration || 30), 0);
  const travelTime = tasks.length * 15; // Assume 15 min average between tasks
  
  return {
    taskTime,
    travelTime,
    totalTime: taskTime + travelTime,
    formatted: formatTime(taskTime + travelTime)
  };
}

// Format time in hours and minutes
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins}min`;
}

// Generate suggestions based on route
function generateSuggestions(tasks, estimatedTime) {
  const suggestions = [];
  
  if (tasks.length > 5) {
    suggestions.push({
      type: 'optimization',
      message: 'Consider splitting tasks across multiple days for better efficiency'
    });
  }
  
  if (estimatedTime.totalTime > 240) { // More than 4 hours
    suggestions.push({
      type: 'time',
      message: 'This route will take over 4 hours. Consider prioritizing urgent tasks only'
    });
  }
  
  // Group tasks by area for batching suggestions
  const locationGroups = {};
  tasks.forEach(task => {
    const area = task.location.name.split(',')[0]; // Simple area grouping
    if (!locationGroups[area]) {
      locationGroups[area] = [];
    }
    locationGroups[area].push(task);
  });
  
  Object.entries(locationGroups).forEach(([area, areaTasks]) => {
    if (areaTasks.length > 1) {
      suggestions.push({
        type: 'batching',
        message: `You have ${areaTasks.length} tasks in the ${area} area - complete them together`
      });
    }
  });
  
  return suggestions;
}

// @route   PUT /api/fix-my-day/addresses
// @desc    Update user's home and work addresses
// @access  Private
router.put('/addresses', auth, async (req, res) => {
  try {
    const { home, work } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        addresses: { home, work }
      },
      { new: true }
    ).select('-password');
    
    res.json({
      success: true,
      addresses: user.addresses
    });
  } catch (error) {
    console.error('Error updating addresses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update addresses'
    });
  }
});

module.exports = router; 