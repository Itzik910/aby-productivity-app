const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const { searchPlaces } = require('./placeService');
const { sendPushNotification } = require('./pushNotificationService');

// Dwell configuration
const DWELL_THRESHOLD_MS = 60 * 60 * 1000; // stationary for 1 hour
const STATIONARY_RADIUS_M = 50; // movement under 50m counts as "same place"
const NEARBY_TASK_RADIUS_M = 2000; // look for open tasks within 2km
const CRON_EXPRESSION = '*/5 * * * *'; // every 5 minutes

// In-memory dwell tracker: userId -> { coords: [lng, lat], since: Date, notified: Set<string> }
const dwellTracker = new Map();

let socketIo = null;
let scheduledTask = null;

/**
 * Haversine distance between two [lng, lat] points, in meters.
 */
function distanceMeters([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function getUserCoordinates(user) {
  const coords = user?.location?.coordinates?.coordinates;
  if (Array.isArray(coords) && coords.length === 2 && coords.every((n) => typeof n === 'number')) {
    return coords; // [lng, lat]
  }
  return null;
}

function normalizeLocationIntent(intent) {
  if (!intent) return '';
  if (Array.isArray(intent)) return intent.filter(Boolean).join(' ');
  return String(intent);
}

/**
 * Update the dwell tracker for a user and return true if they have now dwelled
 * long enough to trigger geofence processing.
 */
function updateDwell(userId, coords, now = new Date()) {
  const key = String(userId);
  const existing = dwellTracker.get(key);

  if (!existing) {
    dwellTracker.set(key, { coords, since: now, notified: new Set() });
    return false;
  }

  const moved = distanceMeters(existing.coords, coords);
  if (moved > STATIONARY_RADIUS_M) {
    // User relocated: reset the dwell window.
    dwellTracker.set(key, { coords, since: now, notified: new Set() });
    return false;
  }

  // Still in roughly the same place; keep the original "since" timestamp.
  existing.coords = coords;
  const dwelledFor = now.getTime() - existing.since.getTime();
  return dwelledFor >= DWELL_THRESHOLD_MS;
}

/**
 * For a dwelling user, find nearby open ACTIONABLE tasks and notify with
 * classic Google Places results (no AI involved).
 */
async function processDwellingUser(user, coords) {
  const key = String(user._id);
  const tracker = dwellTracker.get(key);
  const notified = tracker ? tracker.notified : new Set();

  const nearbyTasks = await Task.findNearby(coords, NEARBY_TASK_RADIUS_M).where({
    user: user._id,
    category: 'ACTIONABLE'
  });

  for (const task of nearbyTasks) {
    if (notified.has(String(task._id))) continue;
    if (!task.locationIntent) continue;

    const query = normalizeLocationIntent(task.locationIntent);
    if (!query) continue;

    // Classic Places API lookup (cost-conscious, no LLM).
    const locationHint = user.location?.city ? ` near ${user.location.city}` : '';
    const places = await searchPlaces(`${query}${locationHint}`);
    const topPlace = places[0];

    const bodyBase = `יש לך משימה פתוחה בקרבת מקום: ${task.title}`;
    const body = topPlace
      ? `${bodyBase} — ${topPlace.name}${topPlace.address ? `, ${topPlace.address}` : ''}`
      : bodyBase;

    const payload = {
      title: 'ABY — הצעה לפי מיקום',
      body,
      url: '/dashboard',
      data: {
        type: 'geofence',
        taskId: String(task._id),
        place: topPlace || null
      }
    };

    try {
      await sendPushNotification(user._id, payload);
    } catch (err) {
      console.error('geofence push failed:', err.message);
    }

    if (socketIo) {
      socketIo.to(String(user._id)).emit('geofence:suggestion', {
        taskId: String(task._id),
        title: task.title,
        place: topPlace || null
      });
    }

    notified.add(String(task._id));
  }
}

/**
 * One scan cycle: evaluate dwell time for every user who has shared a location.
 */
async function runGeofenceCycle(now = new Date()) {
  try {
    const users = await User.find({
      'location.coordinates.coordinates': { $exists: true, $ne: [] }
    }).select('_id location pushSubscription preferences');

    for (const user of users) {
      const coords = getUserCoordinates(user);
      if (!coords) continue;

      const dwelledEnough = updateDwell(user._id, coords, now);
      if (dwelledEnough) {
        await processDwellingUser(user, coords);
      }
    }
  } catch (error) {
    console.error('Geofence cycle error:', error.message);
  }
}

/**
 * Wire up the geofencing cron. Call once after the DB connection is ready.
 */
function initGeofenceScheduler(io) {
  socketIo = io || null;

  if (scheduledTask) return scheduledTask;

  scheduledTask = cron.schedule(CRON_EXPRESSION, () => {
    runGeofenceCycle().catch((err) => console.error('Geofence scheduled run error:', err.message));
  });

  console.log('📍 Geofence dwell-time scheduler initialized (every 5 minutes)');
  return scheduledTask;
}

module.exports = {
  initGeofenceScheduler,
  runGeofenceCycle,
  updateDwell,
  distanceMeters,
  _dwellTracker: dwellTracker
};
