import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  CheckCircle, 
  Phone, 
  Calendar, 
  MapPin, 
  Heart, 
  Target, 
  Clock, 
  Zap, 
  Moon,
  Star,
  ArrowRight,
  Shield,
  Sparkles
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface PremiumStatus {
  isPremium: boolean;
  progress: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
  premiumFeatures: string[];
  upgradeDate?: string;
}

interface PremiumDetails {
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  interests?: string[];
  goals?: string[];
  workSchedule?: string;
  stressLevel?: string;
  sleepPattern?: string;
  dietaryRestrictions?: string[];
  accessibilityNeeds?: string[];
  preferredCommunication?: string;
}

const interests = [
  'productivity', 'health', 'education', 'business', 'technology', 
  'creativity', 'fitness', 'travel', 'cooking', 'reading', 
  'music', 'sports', 'art', 'science', 'finance', 'other'
];

const goals = [
  'career_advancement', 'skill_development', 'health_improvement', 
  'financial_stability', 'personal_growth', 'relationship_building', 
  'work_life_balance', 'learning_new_language', 'starting_business', 
  'fitness_goals', 'other'
];

const workSchedules = [
  '9to5', 'flexible', 'shift_work', 'remote', 'part_time', 
  'freelance', 'student', 'unemployed', 'other'
];

const stressLevels = ['low', 'moderate', 'high', 'very_high'];
const sleepPatterns = ['early_bird', 'night_owl', 'regular', 'irregular'];
const communicationMethods = ['email', 'sms', 'push_notifications', 'in_app', 'phone'];

const PremiumUpgradePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [premiumDetails, setPremiumDetails] = useState<PremiumDetails>({});
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    fetchPremiumStatus();
  }, []);

  const fetchPremiumStatus = async () => {
    try {
      const response = await api.get('/premium/status');
      setPremiumStatus(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching premium status:', error);
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setPremiumDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setPremiumDetails(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setPremiumDetails(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }));
  };

  const updateProfile = async () => {
    try {
      const response = await api.put('/premium/profile', premiumDetails);
      toast.success('Profile updated successfully!');
      
      if (response.data.canUpgrade) {
        toast.success('You can now upgrade to premium!');
      }
      
      fetchPremiumStatus();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const upgradeToPremium = async () => {
    try {
      setUpgrading(true);
      await api.post('/premium/upgrade');
      toast.success('🎉 Welcome to Premium!');
      
      // Update user in store
      if (user) {
        updateUser({ ...user, premium: { isPremium: true, premiumFeatures: [] } });
      }
      
      fetchPremiumStatus();
    } catch (error: any) {
      console.error('Error upgrading to premium:', error);
      toast.error(error.response?.data?.message || 'Failed to upgrade to premium');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (premiumStatus?.isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full">
                  <Crown className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🎉 You're Premium!
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                Welcome to the premium experience. Enjoy all the advanced features!
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {premiumStatus.premiumFeatures.map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200"
                  >
                    <div className="flex items-center mb-3">
                      <Star className="h-6 w-6 text-purple-600 mr-2" />
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {feature.replace(/_/g, ' ')}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Unlock advanced {feature.replace(/_/g, ' ')} features
                    </p>
                  </motion.div>
                ))}
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <p className="text-green-800">
                  <strong>Upgraded on:</strong> {new Date(premiumStatus.upgradeDate!).toLocaleDateString()}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full">
                <Crown className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Unlock Premium Features
            </h1>
            
            <p className="text-xl text-gray-600 mb-6">
              Complete your profile to access advanced productivity tools and AI features
            </p>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Profile Completion</span>
                <span>{premiumStatus?.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${premiumStatus?.progress || 0}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {premiumStatus?.completedFields} of {premiumStatus?.totalFields} required fields completed
              </p>
            </div>
          </div>

          {/* Premium Features Preview */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Premium Features You'll Unlock
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Sparkles, title: 'Advanced AI', desc: 'Unlimited AI-powered suggestions' },
                { icon: Shield, title: 'Unlimited Tasks', desc: 'Create unlimited tasks and projects' },
                { icon: Star, title: 'Priority Support', desc: 'Get faster response times' },
                { icon: Zap, title: 'Custom Themes', desc: 'Personalize your experience' },
                { icon: Target, title: 'Data Export', desc: 'Export your data in various formats' },
                { icon: Crown, title: 'Advanced Analytics', desc: 'Detailed productivity insights' }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200"
                >
                  <feature.icon className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Profile Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Complete Your Profile
            </h2>
            
            <div className="space-y-6">
              {/* Step 1: Basic Contact */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-purple-600" />
                    Contact Information
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={premiumDetails.phoneNumber || ''}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={premiumDetails.dateOfBirth || ''}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Address */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-purple-600" />
                    Address Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={premiumDetails.address?.street || ''}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="123 Main St"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={premiumDetails.address?.city || ''}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="New York"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={premiumDetails.address?.state || ''}
                        onChange={(e) => handleAddressChange('state', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="NY"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP/Postal Code
                      </label>
                      <input
                        type="text"
                        value={premiumDetails.address?.zipCode || ''}
                        onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="10001"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={premiumDetails.address?.country || ''}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="United States"
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Interests & Goals */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Heart className="h-5 w-5 mr-2 text-purple-600" />
                    Interests & Goals
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interests * (Select at least one)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {interests.map((interest) => (
                        <label key={interest} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={premiumDetails.interests?.includes(interest) || false}
                            onChange={(e) => {
                              const current = premiumDetails.interests || [];
                              if (e.target.checked) {
                                handleInputChange('interests', [...current, interest]);
                              } else {
                                handleInputChange('interests', current.filter(i => i !== interest));
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm capitalize">{interest.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Goals * (Select at least one)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {goals.map((goal) => (
                        <label key={goal} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={premiumDetails.goals?.includes(goal) || false}
                            onChange={(e) => {
                              const current = premiumDetails.goals || [];
                              if (e.target.checked) {
                                handleInputChange('goals', [...current, goal]);
                              } else {
                                handleInputChange('goals', current.filter(g => g !== goal));
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm capitalize">{goal.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Lifestyle */}
              {currentStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-purple-600" />
                    Lifestyle & Preferences
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Schedule *
                    </label>
                    <select
                      value={premiumDetails.workSchedule || ''}
                      onChange={(e) => handleInputChange('workSchedule', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select your work schedule</option>
                      {workSchedules.map((schedule) => (
                        <option key={schedule} value={schedule}>
                          {schedule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stress Level *
                    </label>
                    <select
                      value={premiumDetails.stressLevel || ''}
                      onChange={(e) => handleInputChange('stressLevel', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select your stress level</option>
                      {stressLevels.map((level) => (
                        <option key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sleep Pattern *
                    </label>
                    <select
                      value={premiumDetails.sleepPattern || ''}
                      onChange={(e) => handleInputChange('sleepPattern', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select your sleep pattern</option>
                      {sleepPatterns.map((pattern) => (
                        <option key={pattern} value={pattern}>
                          {pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setCurrentStep(5)}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Review & Submit */}
              {currentStep === 5 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-purple-600" />
                    Review & Complete
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <h4 className="font-medium text-gray-900">Profile Summary</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Phone:</span> {premiumDetails.phoneNumber || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Date of Birth:</span> {premiumDetails.dateOfBirth || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">City:</span> {premiumDetails.address?.city || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Country:</span> {premiumDetails.address?.country || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Interests:</span> {premiumDetails.interests?.length || 0} selected
                      </div>
                      <div>
                        <span className="font-medium">Goals:</span> {premiumDetails.goals?.length || 0} selected
                      </div>
                      <div>
                        <span className="font-medium">Work Schedule:</span> {premiumDetails.workSchedule || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Stress Level:</span> {premiumDetails.stressLevel || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Sleep Pattern:</span> {premiumDetails.sleepPattern || 'Not provided'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> By completing your profile, you'll unlock premium features including advanced AI, unlimited tasks, priority support, and more!
                    </p>
                  </div>
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="text-gray-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <div className="space-x-4">
                      <button
                        onClick={updateProfile}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Save Profile
                      </button>
                      <button
                        onClick={upgradeToPremium}
                        disabled={upgrading || !premiumStatus?.progress || premiumStatus.progress < 100}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {upgrading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Upgrading...
                          </>
                        ) : (
                          <>
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade to Premium
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PremiumUpgradePage; 