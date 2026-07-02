const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Explicitly load environment variables from server/.env regardless of the
// directory from which the process is started. This avoids the situation where
// `dotenv` looks in the wrong place when the server is launched via nested npm
// scripts.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Debug: confirm variables loaded (comment out if you don't want this noise)
if (!process.env.MONGODB_URI) {
  console.warn('[WARN] MONGODB_URI is not defined after loading .env');
} else {
  console.log('[DEBUG] Loaded MONGODB_URI from .env:', process.env.MONGODB_URI.slice(0, 50) + '...');
}

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');
const sponsorRoutes = require('./routes/sponsors');
const adminRoutes = require('./routes/admin');
const premiumRoutes = require('./routes/premium');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const userChallengesRoutes = require('./routes/userChallenges');
const fixMyDayRoutes = require('./routes/fixMyDay');

// Import middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Import services
const { initializeDataRetention } = require('./services/dataRetentionService');
const { isPushConfigured } = require('./services/pushNotificationService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aby-productivity', {
  // Remove deprecated options
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
})
.then(() => {
  console.log('🚀 Connected to MongoDB');
  // Initialize data retention service after DB connection
  initializeDataRetention();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('💡 If using MongoDB Atlas, make sure:');
  console.log('   1. Your IP address is whitelisted');
  console.log('   2. Your connection string is correct');
  console.log('   3. Your username/password are correct');
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.HELMET_ENABLED !== 'false'
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests default
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
const maxFileSize = process.env.MAX_FILE_SIZE || 5242880; // 5MB default
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Compression and logging
if (process.env.COMPRESSION_ENABLED !== 'false') {
  app.use(compression());
}
app.use(morgan('combined'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO setup for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user-challenges', userChallengesRoutes);
app.use('/api/fix-my-day', fixMyDayRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      cloudinary: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      pushNotifications: isPushConfigured(),
      analytics: process.env.ANALYTICS_ENABLED !== 'false',
      aiLimits: {
        free: parseInt(process.env.FREE_TIER_MONTHLY_AI_LIMIT) || 50,
        premium: parseInt(process.env.PREMIUM_TIER_MONTHLY_AI_LIMIT) || 1000
      }
    }
  });
});

// Configuration check endpoint
app.get('/api/config', (req, res) => {
  res.json({
    features: {
      fileUpload: {
        enabled: true,
        maxSize: maxFileSize,
        allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
        storage: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) ? 'cloudinary' : 'local'
      },
      pushNotifications: {
        enabled: isPushConfigured(),
        publicKey: process.env.PUSH_NOTIFICATION_PUBLIC_KEY || null
      },
      analytics: {
        enabled: process.env.ANALYTICS_ENABLED !== 'false',
        retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90
      },
      aiLimits: {
        enabled: true,
        freeTierLimit: parseInt(process.env.FREE_TIER_MONTHLY_AI_LIMIT) || 50,
        premiumTierLimit: parseInt(process.env.PREMIUM_TIER_MONTHLY_AI_LIMIT) || 1000
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Local'}`);
  console.log(`🔒 Rate Limit: ${parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 60000} minutes`);
  console.log(`📁 Max File Size: ${maxFileSize} bytes`);
  console.log(`☁️  Cloudinary: ${!!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) ? 'Configured' : 'Not configured'}`);
  console.log(`🔔 Push Notifications: ${isPushConfigured() ? 'Configured' : 'Not configured'}`);
  console.log(`📈 Analytics: ${process.env.ANALYTICS_ENABLED !== 'false' ? 'Enabled' : 'Disabled'}`);
  console.log(`🤖 AI Limits: Free=${parseInt(process.env.FREE_TIER_MONTHLY_AI_LIMIT) || 50}, Premium=${parseInt(process.env.PREMIUM_TIER_MONTHLY_AI_LIMIT) || 1000}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

module.exports = app; 