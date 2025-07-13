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

// Middleware to check if user has Premium access
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.premium.isPremium) {
      return res.status(403).json({
        success: false,
        message: 'Premium access required for this feature',
        upgradeRequired: true
      });
    }

    next();
  } catch (error) {
    console.error('Premium middleware error:', error);
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

    // Premium users have unlimited AI usage
    if (req.user.premium.isPremium) {
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
        message: 'Monthly AI usage limit reached. Complete your profile to unlock premium features.',
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
      message: 'Authorization error'
    });
  }
};

// Middleware to update user's last activity
const updateLastActivity = async (req, res, next) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        lastActivity: new Date()
      });
    }
    next();
  } catch (error) {
    console.error('Update activity middleware error:', error);
    next(); // Don't block the request for this
  }
};

// Middleware to check device limits
const checkDeviceLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const deviceId = req.headers['device-id'] || req.ip;
    const maxDevices = req.user.premium.isPremium ? 5 : 2; // Premium users can use 5 devices, free users 2

    // Check if device is already registered
    const existingDevice = req.user.devices.find(device => device.deviceId === deviceId);
    if (existingDevice) {
      // Update last active time
      existingDevice.lastActive = new Date();
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          'devices.$[device].lastActive': new Date()
        }
      }, {
        arrayFilters: [{ 'device.deviceId': deviceId }]
      });
      return next();
    }

    // Check if user has reached device limit
    if (req.user.devices.length >= maxDevices) {
      return res.status(403).json({
        success: false,
        message: `Device limit reached. You can use up to ${maxDevices} devices.`,
        upgradeRequired: !req.user.premium.isPremium,
        limit: maxDevices
      });
    }

    // Register new device
    req.user.devices.push({
      deviceId,
      deviceName: req.headers['device-name'] || 'Unknown Device',
      lastActive: new Date(),
      isActive: true
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        devices: {
          deviceId,
          deviceName: req.headers['device-name'] || 'Unknown Device',
          lastActive: new Date(),
          isActive: true
        }
      }
    });

    next();
  } catch (error) {
    console.error('Device limit middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Helper function to generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Helper function to verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  auth: authenticateToken, // Alias for backward compatibility
  authenticateToken,
  requirePremium,
  requireAdmin,
  requireSponsor,
  checkAILimit,
  updateLastActivity,
  checkDeviceLimit,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken
}; 