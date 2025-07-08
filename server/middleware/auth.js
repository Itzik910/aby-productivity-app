const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Middleware to check if user has Pro subscription
const requirePro = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.subscription.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Pro subscription required for this feature',
        upgradeRequired: true
      });
    }

    // Check if subscription is still active
    if (req.user.subscription.currentPeriodEnd && 
        new Date() > req.user.subscription.currentPeriodEnd) {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired',
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Pro middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Middleware to check sponsor role
const requireSponsor = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'sponsor' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sponsor access required'
      });
    }

    next();
  } catch (error) {
    console.error('Sponsor middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Middleware to check AI usage limits for free users
const checkAILimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Pro users have unlimited AI usage
    if (req.user.subscription.plan !== 'free') {
      return next();
    }

    // Check monthly AI usage for free users
    const monthlyLimit = 50; // Free users get 50 AI requests per month
    const currentMonth = new Date().getFullYear() * 100 + new Date().getMonth() + 1;
    
    // Reset monthly usage if it's a new month
    if (req.user.aiUsage.lastRequestDate) {
      const lastRequestMonth = req.user.aiUsage.lastRequestDate.getFullYear() * 100 + 
                              req.user.aiUsage.lastRequestDate.getMonth() + 1;
      
      if (currentMonth > lastRequestMonth) {
        await User.findByIdAndUpdate(req.user._id, {
          $set: {
            'aiUsage.monthlyRequests': 0,
            'aiUsage.monthlyTokens': 0
          }
        });
        req.user.aiUsage.monthlyRequests = 0;
        req.user.aiUsage.monthlyTokens = 0;
      }
    }

    if (req.user.aiUsage.monthlyRequests >= monthlyLimit) {
      return res.status(429).json({
        success: false,
        message: 'Monthly AI usage limit reached. Upgrade to Pro for unlimited AI suggestions.',
        upgradeRequired: true,
        limit: monthlyLimit,
        used: req.user.aiUsage.monthlyRequests
      });
    }

    next();
  } catch (error) {
    console.error('AI limit middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Usage limit check error'
    });
  }
};

// Middleware to update last activity
const updateLastActivity = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { lastLogin: new Date() }
      });
    }
    next();
  } catch (error) {
    console.error('Update last activity error:', error);
    next(); // Don't block the request if this fails
  }
};

// Middleware to check device limit
const checkDeviceLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const deviceId = req.headers['device-id'];
    if (!deviceId) {
      return next(); // Skip device check if no device ID
    }

    const maxDevices = req.user.subscription.plan === 'pro' ? 5 : 2;
    const activeDevices = req.user.devices.filter(d => d.isActive);

    // Check if device is already registered
    const existingDevice = req.user.devices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      // Update last activity
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          'devices.$[device].lastActive': new Date()
        }
      }, {
        arrayFilters: [{ 'device.deviceId': deviceId }]
      });
      return next();
    }

    // Check device limit
    if (activeDevices.length >= maxDevices) {
      return res.status(403).json({
        success: false,
        message: `Device limit reached. Maximum ${maxDevices} devices allowed for ${req.user.subscription.plan} plan.`,
        upgradeRequired: req.user.subscription.plan === 'free'
      });
    }

    next();
  } catch (error) {
    console.error('Device limit middleware error:', error);
    next(); // Don't block the request if this fails
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateToken,
  requirePro,
  requireAdmin,
  requireSponsor,
  checkAILimit,
  updateLastActivity,
  checkDeviceLimit,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
}; 