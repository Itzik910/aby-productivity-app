import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Navigation, 
  Clock, 
  Route, 
  Home, 
  Briefcase,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface FixMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OptimizedTask {
  _id: string;
  title: string;
  location: {
    name: string;
    address: string;
  };
  estimatedDuration: number;
  priority: string;
  category: string;
}

const FixMyDayModal: React.FC<FixMyDayModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState({ home: '', work: '' });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  useEffect(() => {
    if (isOpen) {
      checkAddresses();
    }
  }, [isOpen]);

  const checkAddresses = async () => {
    try {
      const response = await api.get('/users/me');
      const userAddresses = response.data.addresses || {};
      
      if (!userAddresses.home || !userAddresses.work) {
        setShowAddressForm(true);
      } else {
        setAddresses(userAddresses);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const saveAddresses = async () => {
    try {
      if (!addresses.home || !addresses.work) {
        toast.error('Please enter both home and work addresses');
        return;
      }

      await api.put('/fix-my-day/addresses', addresses);
      toast.success('Addresses saved!');
      setShowAddressForm(false);
      generateRoute();
    } catch (error) {
      console.error('Error saving addresses:', error);
      toast.error('Failed to save addresses');
    }
  };

  const generateRoute = async () => {
    try {
      setLoading(true);
      
      // Get current location if available
      let currentLocation = null;
      if (navigator.geolocation && isWeekend) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          currentLocation = `${position.coords.latitude},${position.coords.longitude}`;
        } catch (error) {
          console.log('Could not get current location');
        }
      }

      const response = await api.post('/fix-my-day', {
        currentLocation,
        isWeekend
      });

      setOptimizedRoute(response.data.data);
    } catch (error: any) {
      console.error('Error generating route:', error);
      toast.error(error.response?.data?.message || 'Failed to generate route');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Route className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Fix My Day</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {showAddressForm ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-900">Set Your Addresses</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        We need your home and work addresses to optimize your route
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Home className="w-4 h-4 inline mr-1" />
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={addresses.home}
                    onChange={(e) => setAddresses({ ...addresses, home: e.target.value })}
                    placeholder="Enter your home address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Briefcase className="w-4 h-4 inline mr-1" />
                    Work Address
                  </label>
                  <input
                    type="text"
                    value={addresses.work}
                    onChange={(e) => setAddresses({ ...addresses, work: e.target.value })}
                    placeholder="Enter your work address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={saveAddresses}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Save Addresses & Generate Route
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Optimizing your route...</p>
              </div>
            ) : optimizedRoute ? (
              <div className="space-y-6">
                {/* Route Summary */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Your Optimized Route</h3>
                    <span className="text-sm text-gray-600">
                      {isWeekend ? 'Weekend Route' : 'Weekday Route'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {optimizedRoute.totalTasks}
                      </div>
                      <div className="text-sm text-gray-600">Tasks</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {optimizedRoute.estimatedTime.formatted}
                      </div>
                      <div className="text-sm text-gray-600">Total Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {optimizedRoute.estimatedTime.taskTime}min
                      </div>
                      <div className="text-sm text-gray-600">Task Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {optimizedRoute.estimatedTime.travelTime}min
                      </div>
                      <div className="text-sm text-gray-600">Travel Time</div>
                    </div>
                  </div>
                </div>

                {/* Route Steps */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
                    <Home className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">Start</div>
                      <div className="text-sm text-gray-600">{optimizedRoute.startPoint}</div>
                    </div>
                  </div>

                  {optimizedRoute.tasks.map((task: OptimizedTask, index: number) => (
                    <div key={task._id} className="relative">
                      {index > 0 && (
                        <div className="absolute left-6 -top-3 w-0.5 h-6 bg-gray-300"></div>
                      )}
                      <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="flex items-center text-xs text-gray-500">
                              <MapPin className="w-3 h-3 mr-1" />
                              {task.location.name}
                            </span>
                            <span className="flex items-center text-xs text-gray-500">
                              <Clock className="w-3 h-3 mr-1" />
                              {task.estimatedDuration}min
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">End</div>
                      <div className="text-sm text-gray-600">{optimizedRoute.endPoint}</div>
                    </div>
                  </div>
                </div>

                {/* Suggestions */}
                {optimizedRoute.suggestions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Suggestions</h4>
                    {optimizedRoute.suggestions.map((suggestion: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">{suggestion.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => {
                    toast.success('Route saved! Check your tasks for optimized order');
                    onClose();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Start My Optimized Day</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Optimize Your Day?</h3>
                <p className="text-gray-600 mb-6">
                  {isWeekend 
                    ? "Let's plan your weekend tasks efficiently!"
                    : "Optimize your commute and complete tasks along the way!"
                  }
                </p>
                <button
                  onClick={generateRoute}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Generate Optimized Route
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FixMyDayModal; 