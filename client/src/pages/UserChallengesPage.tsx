import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Target, 
  Calendar, 
  Trophy, 
  Clock, 
  TrendingUp,
  CheckCircle,
  Pause,
  Play,
  Edit,
  Trash2,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface UserChallenge {
  _id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  startDate: string;
  endDate: string;
  duration: number;
  target: {
    value: number;
    unit: string;
    frequency: string;
  };
  progress: {
    current: number;
    percentage: number;
    lastUpdated: string;
  };
  status: string;
  analytics: {
    streakCurrent: number;
    streakBest: number;
    totalCheckIns: number;
  };
}

const UserChallengesPage: React.FC = () => {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'habit',
    category: 'personal',
    duration: 30,
    target: {
      value: 1,
      unit: 'times',
      frequency: 'daily'
    }
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user-challenges', {
        params: filterStatus !== 'all' ? { status: filterStatus } : {}
      });
      setChallenges(response.data.challenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const createChallenge = async () => {
    try {
      if (!newChallenge.title.trim()) {
        toast.error('Please enter a challenge title');
        return;
      }

      const challengeData = {
        ...newChallenge,
        startDate: new Date(),
        endDate: new Date(Date.now() + newChallenge.duration * 24 * 60 * 60 * 1000)
      };

      await api.post('/user-challenges', challengeData);
      toast.success('Challenge created! 🎯');
      setShowCreateModal(false);
      setNewChallenge({
        title: '',
        description: '',
        type: 'habit',
        category: 'personal',
        duration: 30,
        target: {
          value: 1,
          unit: 'times',
          frequency: 'daily'
        }
      });
      fetchChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    }
  };

  const updateProgress = async (challengeId: string, value: number) => {
    try {
      await api.post(`/user-challenges/${challengeId}/progress`, { value });
      toast.success('Progress updated! 📈');
      fetchChallenges();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const deleteChallenge = async (challengeId: string) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    
    try {
      await api.delete(`/user-challenges/${challengeId}`);
      toast.success('Challenge deleted');
      fetchChallenges();
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Failed to delete challenge');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      health: 'bg-green-500',
      fitness: 'bg-blue-500',
      learning: 'bg-purple-500',
      career: 'bg-orange-500',
      personal: 'bg-pink-500',
      social: 'bg-indigo-500',
      financial: 'bg-yellow-500',
      other: 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Challenges</h1>
            <p className="text-gray-600 mt-2">Create and track your personal goals</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>New Challenge</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          {['all', 'active', 'completed', 'paused'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                fetchChallenges();
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => (
            <motion.div
              key={challenge._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              {/* Challenge Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{challenge.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{challenge.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(challenge.status)}`}>
                    {challenge.status}
                  </span>
                </div>
              </div>

              {/* Category & Type */}
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${getCategoryColor(challenge.category)}`}></div>
                <span className="text-sm text-gray-600 capitalize">{challenge.category}</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-sm text-gray-600 capitalize">{challenge.type}</span>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">
                    {challenge.progress.current}/{challenge.target.value} {challenge.target.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(challenge.progress.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs text-gray-500 mt-1">
                  {challenge.progress.percentage}%
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {challenge.analytics.streakCurrent}
                  </div>
                  <div className="text-xs text-gray-600">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {challenge.analytics.totalCheckIns}
                  </div>
                  <div className="text-xs text-gray-600">Check-ins</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {challenge.status === 'active' && (
                  <button
                    onClick={() => updateProgress(challenge._id, 1)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Check In
                  </button>
                )}
                <button
                  onClick={() => deleteChallenge(challenge._id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {challenges.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Challenges Yet</h3>
            <p className="text-gray-600 mb-6">Create your first personal challenge to get started!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Create Challenge
            </button>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Challenge</h2>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    placeholder="e.g., Read 30 minutes daily"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newChallenge.description}
                    onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                    placeholder="Describe your challenge..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Type & Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newChallenge.type}
                      onChange={(e) => setNewChallenge({ ...newChallenge, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="habit">Habit</option>
                      <option value="goal">Goal</option>
                      <option value="skill">Skill</option>
                      <option value="fitness">Fitness</option>
                      <option value="learning">Learning</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={newChallenge.category}
                      onChange={(e) => setNewChallenge({ ...newChallenge, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="personal">Personal</option>
                      <option value="health">Health</option>
                      <option value="fitness">Fitness</option>
                      <option value="learning">Learning</option>
                      <option value="career">Career</option>
                      <option value="social">Social</option>
                      <option value="financial">Financial</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Target */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
                    <input
                      type="number"
                      value={newChallenge.duration}
                      onChange={(e) => setNewChallenge({ ...newChallenge, duration: parseInt(e.target.value) })}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Value</label>
                    <input
                      type="number"
                      value={newChallenge.target.value}
                      onChange={(e) => setNewChallenge({ 
                        ...newChallenge, 
                        target: { ...newChallenge.target, value: parseInt(e.target.value) }
                      })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Target Unit & Frequency */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                    <select
                      value={newChallenge.target.unit}
                      onChange={(e) => setNewChallenge({ 
                        ...newChallenge, 
                        target: { ...newChallenge.target, unit: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="times">Times</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="pages">Pages</option>
                      <option value="steps">Steps</option>
                      <option value="kilometers">Kilometers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <select
                      value={newChallenge.target.frequency}
                      onChange={(e) => setNewChallenge({ 
                        ...newChallenge, 
                        target: { ...newChallenge.target, frequency: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="total">Total</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createChallenge}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Create Challenge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserChallengesPage; 