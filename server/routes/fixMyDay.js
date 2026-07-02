const express = require('express');
const router = express.Router();
const axios = require('axios');
const Task = require('../models/Task');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { getPlaceSuggestions } = require('../services/placeService');

// @route   POST /api/fix-my-day
// @desc    Generate optimized route for completing tasks
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { currentLocation, isWeekend, preferredLocation = 'both', selectedTaskIds } = req.body;
    const userId = req.user.id;

    // Get user with addresses
    const user = await User.findById(userId);
    
    if (!user.addresses?.home || !user.addresses?.work) {
      return res.status(400).json({
        success: false,
        message: 'Please set your home and work addresses in your profile first'
      });
    }

    const worksFromHome = user.addresses.home === user.addresses.work;

    // Build task query – filter by selected IDs if the user manually picked them
    const taskQuery = {
      user: userId,
      status: { $in: ['pending', 'in_progress'] }
    };

    if (Array.isArray(selectedTaskIds) && selectedTaskIds.length > 0) {
      taskQuery._id = { $in: selectedTaskIds };
    }

    // Get pending tasks and resolve real places for each one
    const tasks = await Task.find(taskQuery).sort({ priority: -1, dueDate: 1 });

    const tasksWithPlaceContext = await Promise.all(tasks.map(async (task) => {
      const suggestedPlaces = await getPlaceSuggestions(task, user);
      const primaryPlace = task.location?.name && task.location?.address
        ? task.location
        : suggestedPlaces[0]
          ? { name: suggestedPlaces[0].name, address: suggestedPlaces[0].address }
          : null;
      const taskData = typeof task.toObject === 'function' ? task.toObject() : { ...task };

      return {
        ...taskData,
        location: primaryPlace || task.location || null,
        recommendedPlaces: suggestedPlaces
      };
    }));
    const placeContextByTaskId = new Map(
      tasksWithPlaceContext.map(task => [String(task._id), task.recommendedPlaces || []])
    );

    const routableTasks = tasksWithPlaceContext.filter(task => task.location?.name || task.location?.address);

    if (routableTasks.length === 0) {
      return res.json({
        success: true,
        message: 'No location-based tasks or place suggestions to optimize',
        route: []
      });
    }

    const normalizedPreferredLocation = String(preferredLocation).toLowerCase();

    // Determine start and end points based on the chosen context
    let startPoint, endPoint;

    if (normalizedPreferredLocation === 'home') {
      startPoint = user.addresses.home;
      endPoint = user.addresses.home;
    } else if (normalizedPreferredLocation === 'work') {
      startPoint = user.addresses.work;
      endPoint = user.addresses.work;
    } else if (normalizedPreferredLocation === 'current') {
      if (!currentLocation) {
        return res.status(400).json({
          success: false,
          message: 'Current location is required for the current-location mode'
        });
      }
      startPoint = currentLocation;
      endPoint = currentLocation;
    } else if (normalizedPreferredLocation === 'both') {
      // When home == work (works-from-home), treat both as home
      if (worksFromHome) {
        startPoint = user.addresses.home;
        endPoint = user.addresses.home;
      } else {
        // "Both" means a home/work corridor route, not a round trip loop.
        const hour = new Date().getHours();
        if (isWeekend && currentLocation) {
          startPoint = currentLocation;
          endPoint = user.addresses.home;
        } else if (hour < 12) {
          startPoint = user.addresses.home;
          endPoint = user.addresses.work;
        } else if (hour < 17) {
          startPoint = user.addresses.home;
          endPoint = user.addresses.work;
        } else {
          startPoint = user.addresses.work;
          endPoint = user.addresses.home;
        }
      }
    } else {
      startPoint = user.addresses.home;
      endPoint = user.addresses.work;
    }

    // Build route: use Google Maps Directions API when key is available, else heuristic
    let optimizedRoute;
    let routeUrl = null;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

    if (mapsKey && routableTasks.length > 0) {
      try {
        const waypoints = routableTasks.map(t => encodeURIComponent(t.location.address || t.location.name)).join('|');
        const origin = encodeURIComponent(startPoint);
        const destination = encodeURIComponent(endPoint);
        const mapsRes = await axios.get(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypoints}&key=${mapsKey}`
        );

        if (mapsRes.data.status === 'OK') {
          const route = mapsRes.data.routes[0];
          const waypointOrder = route.waypoint_order;
          const legs = route.legs;

          const reordered = waypointOrder.map(i => routableTasks[i]);

          optimizedRoute = reordered.map((task, index) => {
            const leg = legs[index];
            const directions = leg
              ? leg.steps.map(s => s.html_instructions.replace(/<[^>]+>/g, ''))
              : [];
            return {
              _id: task._id,
              title: task.title,
              location: task.location,
              estimatedDuration: task.estimatedDuration || 30,
              priority: task.priority,
              dueDate: task.dueDate,
              category: task.category,
              directions,
              distanceText: leg?.distance?.text,
              durationText: leg?.duration?.text
            };
          });

          // Build a Google Maps deep-link URL
          const waypointAddresses = optimizedRoute
            .slice(0, -1)
            .map(t => encodeURIComponent(t.location.address || t.location.name))
            .join('/');
          routeUrl = `https://www.google.com/maps/dir/${origin}/${waypointAddresses}/${destination}`;
        } else {
          console.warn('Google Maps API non-OK status:', mapsRes.data.status);
          optimizedRoute = optimizeTaskRoute(routableTasks, startPoint, endPoint, {
            preferredLocation: normalizedPreferredLocation,
            homeAddress: user.addresses.home,
            workAddress: user.addresses.work
          });
        }
      } catch (mapsError) {
        console.error('Google Maps API error, falling back to heuristic:', mapsError.message);
        optimizedRoute = optimizeTaskRoute(routableTasks, startPoint, endPoint, {
          preferredLocation: normalizedPreferredLocation,
          homeAddress: user.addresses.home,
          workAddress: user.addresses.work
        });
      }
    } else {
      optimizedRoute = optimizeTaskRoute(routableTasks, startPoint, endPoint, {
        preferredLocation: normalizedPreferredLocation,
        homeAddress: user.addresses.home,
        workAddress: user.addresses.work
      });
    }

    const routeTasksWithPlaces = await Promise.all(
      optimizedRoute.map(async (task, index) => {
        if (index >= 3) {
          return { ...task, recommendedPlaces: [] };
        }
        return {
          ...task,
          recommendedPlaces: placeContextByTaskId.get(String(task._id)) || []
        };
      })
    );

    // Calculate estimated time
    const estimatedTime = calculateEstimatedTime(routeTasksWithPlaces);

    res.json({
      success: true,
      data: {
        startPoint,
        endPoint,
        preferredLocation: normalizedPreferredLocation,
        tasks: routeTasksWithPlaces,
        estimatedTime,
        totalTasks: optimizedRoute.length,
        routeUrl,
        usingMaps: !!mapsKey,
        suggestions: generateSuggestions(optimizedRoute, estimatedTime)
      }
    });  } catch (error) {
    console.error('Error in Fix My Day:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate route optimization'
    });
  }
});

// Helper function to optimize route (simplified version)
function optimizeTaskRoute(tasks, startPoint, endPoint, routeContext = {}) {
  // In a real implementation, this would use Google Maps API
  // For now, we'll sort by priority and group by general area
  
  const priorityWeight = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const normalize = (value) => String(value || '').toLowerCase();
  const routeKeywords = [
    normalize(routeContext.homeAddress),
    normalize(routeContext.workAddress),
    normalize(startPoint),
    normalize(endPoint)
  ].filter(Boolean);

  const getLocationScore = (task) => {
    const locationText = normalize(`${task.location?.name || ''} ${task.location?.address || ''}`);
    let score = 0;

    routeKeywords.forEach((keyword) => {
      if (keyword && locationText.includes(keyword)) {
        score += 50;
      }
    });

    if (routeContext.preferredLocation === 'both') {
      if (locationText.includes('home') || locationText.includes('work')) {
        score += 25;
      }
    }

    return score;
  };

  return tasks
    .sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const locationDiff = getLocationScore(b) - getLocationScore(a);
      if (locationDiff !== 0) return locationDiff;
      
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