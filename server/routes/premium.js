const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

// Get premium status and requirements
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const requiredFields = [
      'phoneNumber',
      'dateOfBirth', 
      'address.city',
      'address.country',
      'interests',
      'goals',
      'workSchedule',
      'stressLevel',
      'sleepPattern'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => obj && obj[key], user.premiumDetails);
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    
    const progress = Math.round((completedFields.length / requiredFields.length) * 100);
    
    res.json({
      isPremium: user.premium.isPremium,
      progress,
      completedFields: completedFields.length,
      totalFields: requiredFields.length,
      missingFields: requiredFields.filter(field => !completedFields.includes(field)),
      premiumFeatures: user.premium.premiumFeatures,
      upgradeDate: user.premium.upgradeDate
    });
  } catch (error) {
    console.error('Error getting premium status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update premium profile details
router.put('/profile', auth, [
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please enter a valid date'),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('address.country').optional().trim(),
  body('emergencyContact.name').optional().trim(),
  body('emergencyContact.relationship').optional().trim(),
  body('emergencyContact.phone').optional().trim(),
  body('interests').optional().isArray(),
  body('goals').optional().isArray(),
  body('workSchedule')
    .optional()
    .isIn(['9to5', 'flexible', 'shift_work', 'remote', 'part_time', 'freelance', 'student', 'unemployed', 'other']),
  body('stressLevel')
    .optional()
    .isIn(['low', 'moderate', 'high', 'very_high']),
  body('sleepPattern')
    .optional()
    .isIn(['early_bird', 'night_owl', 'regular', 'irregular']),
  body('dietaryRestrictions').optional().isArray(),
  body('accessibilityNeeds').optional().isArray(),
  body('preferredCommunication')
    .optional()
    .isIn(['email', 'sms', 'push_notifications', 'in_app', 'phone'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update premium details
    if (req.body.phoneNumber) user.premiumDetails.phoneNumber = req.body.phoneNumber;
    if (req.body.dateOfBirth) user.premiumDetails.dateOfBirth = new Date(req.body.dateOfBirth);
    if (req.body.address) {
      user.premiumDetails.address = { ...user.premiumDetails.address, ...req.body.address };
    }
    if (req.body.emergencyContact) {
      user.premiumDetails.emergencyContact = { ...user.premiumDetails.emergencyContact, ...req.body.emergencyContact };
    }
    if (req.body.interests) user.premiumDetails.interests = req.body.interests;
    if (req.body.goals) user.premiumDetails.goals = req.body.goals;
    if (req.body.workSchedule) user.premiumDetails.workSchedule = req.body.workSchedule;
    if (req.body.stressLevel) user.premiumDetails.stressLevel = req.body.stressLevel;
    if (req.body.sleepPattern) user.premiumDetails.sleepPattern = req.body.sleepPattern;
    if (req.body.dietaryRestrictions) user.premiumDetails.dietaryRestrictions = req.body.dietaryRestrictions;
    if (req.body.accessibilityNeeds) user.premiumDetails.accessibilityNeeds = req.body.accessibilityNeeds;
    if (req.body.preferredCommunication) user.premiumDetails.preferredCommunication = req.body.preferredCommunication;

    await user.save();

    // Check if user can now upgrade to premium
    const canUpgrade = user.canUpgradeToPremium();
    
    res.json({
      message: 'Profile updated successfully',
      canUpgrade,
      premiumDetails: user.premiumDetails
    });
  } catch (error) {
    console.error('Error updating premium profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upgrade to premium
router.post('/upgrade', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.premium.isPremium) {
      return res.status(400).json({ message: 'User is already premium' });
    }

    if (!user.canUpgradeToPremium()) {
      return res.status(400).json({ 
        message: 'Cannot upgrade to premium: missing required profile details',
        requiredFields: [
          'phoneNumber',
          'dateOfBirth',
          'address.city',
          'address.country', 
          'interests',
          'goals',
          'workSchedule',
          'stressLevel',
          'sleepPattern'
        ]
      });
    }

    await user.upgradeToPremium();

    res.json({
      message: 'Successfully upgraded to premium!',
      isPremium: user.premium.isPremium,
      premiumFeatures: user.premium.premiumFeatures,
      upgradeDate: user.premium.upgradeDate
    });
  } catch (error) {
    console.error('Error upgrading to premium:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get premium features
router.get('/features', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const allFeatures = {
      advanced_ai: {
        name: 'Advanced AI',
        description: 'Unlimited AI-powered task suggestions and insights',
        icon: '🤖'
      },
      unlimited_tasks: {
        name: 'Unlimited Tasks',
        description: 'Create unlimited tasks and projects',
        icon: '📝'
      },
      priority_support: {
        name: 'Priority Support',
        description: 'Get faster response times from our support team',
        icon: '🎯'
      },
      custom_themes: {
        name: 'Custom Themes',
        description: 'Personalize your app with custom themes and colors',
        icon: '🎨'
      },
      data_export: {
        name: 'Data Export',
        description: 'Export your data in various formats',
        icon: '📊'
      },
      advanced_analytics: {
        name: 'Advanced Analytics',
        description: 'Detailed insights into your productivity patterns',
        icon: '📈'
      },
      team_features: {
        name: 'Team Features',
        description: 'Collaborate with team members on shared projects',
        icon: '👥'
      },
      api_access: {
        name: 'API Access',
        description: 'Access to our API for custom integrations',
        icon: '🔌'
      }
    };

    const userFeatures = user.premium.isPremium ? user.premium.premiumFeatures : [];
    
    res.json({
      isPremium: user.premium.isPremium,
      userFeatures: userFeatures.map(feature => ({
        key: feature,
        ...allFeatures[feature]
      })),
      allFeatures: Object.entries(allFeatures).map(([key, feature]) => ({
        key,
        ...feature
      }))
    });
  } catch (error) {
    console.error('Error getting premium features:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 