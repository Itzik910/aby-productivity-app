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
  Sparkles
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
  location: { name: string; address: string };
  estimatedDuration: number;
  priority: string;
  category: string;
  directions?: string[];
  recommendedPlaces?: Array<{
    name: string;
    address: string;
    rating?: number | null;
    costText?: string;
    placeId?: string;
    mapsUrl?: string;
  }>;
}

type RouteMode = 'home' | 'work' | 'both' | 'current';
type ActiveTab = 'plan' | 'taskPicker' | 'todayRoute';

const FixMyDayModal: React.FC<FixMyDayModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState({ home: '', work: '' });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [preferredLocation, setPreferredLocation] = useState<RouteMode | ''>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [taskOrderMode, setTaskOrderMode] = useState<'auto' | 'manual'>('auto');
  const [availableTasks, setAvailableTasks] = useState<Array<{ _id: string; title: string; priority: string }>>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const worksFromHome = !!(addresses.home && addresses.work && addresses.home === addresses.work);

  useEffect(() => {
    if (isOpen) {
      setOptimizedRoute(null);
      setPreferredLocation('');
      setActiveTab('plan');
      setTaskOrderMode('auto');
      setSelectedTaskIds([]);
      checkAddresses();
    }
  }, [isOpen]);

  const checkAddresses = async () => {
    try {
      const response = await api.get('/users/profile');
      const profile = response.data.data || response.data;
      const userAddresses = profile?.addresses || {};
      if (!userAddresses.home || !userAddresses.work) {
        setShowAddressForm(true);
      } else {
        setAddresses(userAddresses);
        setShowAddressForm(false);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const fetchAvailableTasks = async () => {
    try {
      const response = await api.get('/tasks?status=pending&limit=50');
      setAvailableTasks(
        (response.data.tasks || []).map((t: any) => ({
          _id: t._id,
          title: t.title,
          priority: t.priority,
        }))
      );
    } catch (error) {
      console.error('Error fetching tasks for picker:', error);
    }
  };

  const handleOrderModeChange = (mode: 'auto' | 'manual') => {
    setTaskOrderMode(mode);
    if (mode === 'manual') {
      fetchAvailableTasks();
      setActiveTab('taskPicker');
    } else {
      setSelectedTaskIds([]);
      setActiveTab('plan');
    }
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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
    } catch (error) {
      console.error('Error saving addresses:', error);
      toast.error('Failed to save addresses');
    }
  };

  const generateRoute = async () => {
    try {
      setLoading(true);
      let currentLocation: string | null = null;
      const needsCurrentLocation = preferredLocation === 'current' || (preferredLocation === 'both' && isWeekend);
      if (navigator.geolocation && needsCurrentLocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          currentLocation = `${position.coords.latitude},${position.coords.longitude}`;
        } catch {
          console.log('Could not get current location');
        }
      }
      if (preferredLocation === 'current' && !currentLocation) {
        throw new Error('Current location is required for this mode');
      }
      const response = await api.post('/fix-my-day', {
        currentLocation,
        isWeekend,
        preferredLocation: preferredLocation || 'both',
        selectedTaskIds: taskOrderMode === 'manual' && selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
      });
      const routeData = response.data.data;
      setOptimizedRoute(routeData);
      setActiveTab('todayRoute');
      // Persist last route so user can re-open it later
      try {
        localStorage.setItem(
          'aby-last-fix-my-day',
          JSON.stringify({ route: routeData, preferredLocation: preferredLocation || 'both', savedAt: new Date().toISOString() })
        );
      } catch { /* localStorage quota — silently skip */ }
    } catch (error: any) {
      console.error('Error generating route:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to generate route');
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

  const renderContent = () => {
    if (showAddressForm) {
      return (
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
              onChange={e => setAddresses({ ...addresses, home: e.target.value })}
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
              onChange={e => setAddresses({ ...addresses, work: e.target.value })}
              placeholder="Enter your work address"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={saveAddresses}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Save Addresses
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Asking ABY to map the smartest route...</p>
        </div>
      );
    }

    if (activeTab === 'todayRoute' && optimizedRoute) {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Optimized Route</h3>
              <span className="text-sm text-gray-600 capitalize">
                {preferredLocation === 'current' ? 'current location' : preferredLocation || 'both'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tasks', value: String(optimizedRoute.totalTasks), color: 'text-purple-600' },
                { label: 'Total Time', value: optimizedRoute.estimatedTime.formatted, color: 'text-blue-600' },
                { label: 'Task Time', value: `${optimizedRoute.estimatedTime.taskTime}min`, color: 'text-green-600' },
                { label: 'Travel Time', value: `${optimizedRoute.estimatedTime.travelTime}min`, color: 'text-orange-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-sm text-gray-600">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

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
                {index > 0 && <div className="absolute left-6 -top-3 w-0.5 h-6 bg-gray-300"></div>}
                <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <div className="flex items-center space-x-3 mt-1 flex-wrap gap-y-1">
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
                    {task.directions && task.directions.length > 0 && (
                      <ol className="mt-2 space-y-1 list-decimal list-inside">
                        {task.directions.map((step, si) => (
                          <li key={si} className="text-xs text-gray-500">{step}</li>
                        ))}
                      </ol>
                    )}
                    {task.recommendedPlaces && task.recommendedPlaces.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Nearby businesses to consider</div>
                        <div className="space-y-2">
                          {task.recommendedPlaces.map(place => (
                            <a
                              key={`${place.placeId || place.name}-${place.address}`}
                              href={place.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)} ${encodeURIComponent(place.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg border border-gray-200 px-3 py-2 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{place.name}</div>
                                  <div className="text-xs text-gray-500">{place.address}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  {place.rating ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
                                      {place.rating.toFixed(1)}★
                                    </span>
                                  ) : null}
                                  {place.costText ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                                      {place.costText}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
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

          {optimizedRoute.routeUrl && (
            <a
              href={optimizedRoute.routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Open in Google Maps
            </a>
          )}

          {optimizedRoute.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Suggestions</h4>
              {optimizedRoute.suggestions.map((s: any, i: number) => (
                <div key={i} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{s.message}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { toast.success('Route saved!'); onClose(); }}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Start My Optimized Day</span>
          </button>
        </div>
      );
    }

    if (activeTab === 'taskPicker') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Choose tasks for today</h3>
            <span className="text-sm text-gray-500">{selectedTaskIds.length} selected</span>
          </div>
          <p className="text-sm text-gray-600">
            Check the tasks you want in today's route. ABY will order them smartly.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableTasks.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No pending tasks found</p>
            ) : (
              availableTasks.map(task => (
                <label
                  key={task._id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTaskIds.includes(task._id)
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(task._id)}
                    onChange={() => toggleTaskSelection(task._id)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-900">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </label>
              ))
            )}
          </div>
          <button
            onClick={() => {
              if (selectedTaskIds.length === 0) {
                toast.error('Please select at least one task');
                return;
              }
              generateRoute();
            }}
            disabled={selectedTaskIds.length === 0 || !preferredLocation}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!preferredLocation
              ? 'Go back to Plan and pick a location first'
              : `Generate Route with ${selectedTaskIds.length} task${selectedTaskIds.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      );
    }

    // Default: plan tab — show "View Last Route" if one is stored
    const savedRouteRaw = localStorage.getItem('aby-last-fix-my-day');
    const savedRoute = savedRouteRaw ? (() => { try { return JSON.parse(savedRouteRaw); } catch { return null; } })() : null;

    return (
      <div className="text-center py-6">
        <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Where should ABY focus today?</h3>

        {savedRoute && (
          <div className="mb-4 max-w-md mx-auto">
            <button
              onClick={() => {
                setOptimizedRoute(savedRoute.route);
                setPreferredLocation(savedRoute.preferredLocation || 'both');
                setActiveTab('todayRoute');
              }}
              className="w-full px-4 py-2 border border-purple-300 text-purple-700 rounded-xl text-sm hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              <Route className="w-4 h-4" />
              View last route
              {savedRoute.savedAt && (
                <span className="text-xs text-gray-400 ml-1">
                  ({new Date(savedRoute.savedAt).toLocaleDateString()})
                </span>
              )}
            </button>
          </div>
        )}        <p className="text-gray-600 mb-6">
          Pick a mode and I'll tune the recommendations accordingly.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {[
            { id: 'home', label: 'Home', icon: Home, helper: 'Chill zone mode' },
            ...(!worksFromHome ? [
              { id: 'work', label: 'Work', icon: Briefcase, helper: 'Office rocket mode' },
              { id: 'both', label: 'Both', icon: Route, helper: 'Home/work corridor' },
            ] : []),
            { id: 'current', label: 'Current', icon: MapPin, helper: 'Wherever you are now' },
          ].map(option => {
            const Icon = option.icon;
            const active = preferredLocation === option.id;
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`route-mode-${option.id}`}
                onClick={() => setPreferredLocation(option.id as RouteMode)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-purple-200 hover:bg-purple-50'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">{option.helper}</div>
              </button>
            );
          })}
        </div>

        {preferredLocation && (
          <div className="mt-6 max-w-md mx-auto w-full">
            <p className="text-sm font-medium text-gray-700 mb-2 text-left">How should ABY order your tasks?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleOrderModeChange('auto')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  taskOrderMode === 'auto'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-purple-200'
                }`}
              >
                By priority &amp; due date
              </button>
              <button
                type="button"
                onClick={() => handleOrderModeChange('manual')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  taskOrderMode === 'manual'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-600 hover:border-purple-200'
                }`}
              >
                I'll pick the tasks
              </button>
            </div>
          </div>
        )}

        <button
          onClick={taskOrderMode === 'manual' ? () => setActiveTab('taskPicker') : generateRoute}
          disabled={!preferredLocation}
          className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {taskOrderMode === 'manual' ? 'Pick Tasks' : 'Generate Recommendations'}
        </button>
      </div>
    );
  };

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
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Route className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Fix My Day</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Tab bar */}
            <div className="mb-4 flex rounded-xl bg-gray-100 p-1">
              {(
                [
                  { key: 'plan', label: 'Plan', disabled: false },
                  { key: 'taskPicker', label: 'Pick Tasks', disabled: taskOrderMode !== 'manual' },
                  { key: 'todayRoute', label: 'Today Route', disabled: !optimizedRoute },
                ] as Array<{ key: ActiveTab; label: string; disabled: boolean }>
              ).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && setActiveTab(tab.key)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-purple-700 shadow-sm'
                      : tab.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {renderContent()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FixMyDayModal;
