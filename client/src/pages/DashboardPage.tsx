import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Target, 
  Zap, 
  Award, 
  MapPin,
  Plus,
  ArrowRight,
  Sparkles,
  Trophy,
  Star,
  BarChart3,
  PieChart,
  Activity,
  Navigation
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { useTaskModalStore } from '../stores/taskModalStore';
import FixMyDayModal from '../components/FixMyDayModal';
import PlanMyDay from '../components/PlanMyDay';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionTime: number;
  totalTimeSpent: number;
  categoryBreakdown: string[];
  priorityBreakdown: string[];
}

interface RecentTask {
  _id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string;
  progress: { percentage: number };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  isUnlocked: boolean;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();

  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const openTaskModal = useTaskModalStore(state => state.openModal);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [showFixMyDay, setShowFixMyDay] = useState(false);
  const [showPlanMyDay, setShowPlanMyDay] = useState(false);
  const [selectedRecentTask, setSelectedRecentTask] = useState<RecentTask | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchMotivationalMessage();
  }, [selectedTimeRange]);

  // Refresh when a task is created anywhere in the app
  useEffect(() => {
    const handleTaskCreated = () => {
      fetchDashboardData();
    };
    window.addEventListener('taskCreated', handleTaskCreated);
    return () => window.removeEventListener('taskCreated', handleTaskCreated);
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, tasksResponse, allTasksResponse] = await Promise.all([
        api.get(`/tasks/analytics/summary?timeRange=${selectedTimeRange}`),
        api.get('/tasks?limit=5&sortBy=createdAt&sortOrder=desc'),
        api.get('/tasks?limit=500&sortBy=createdAt&sortOrder=desc')
      ]);

      const summary = statsResponse.data || {};
      const allTasks = allTasksResponse.data?.tasks || [];

      const deriveFallbackStats = () => {
        const totals = allTasks.reduce((acc: any, task: any) => {
          acc.totalTasks += 1;
          if (task.status === 'completed') acc.completedTasks += 1;
          if (task.status === 'pending' && new Date(task.dueDate) < new Date()) acc.overdueTasks += 1;
          acc.totalTimeSpent += task.analytics?.timeSpent || task.actualDuration || 0;
          if (task.category) acc.categoryBreakdown.add(task.category);
          if (task.priority) acc.priorityBreakdown.add(task.priority);
          return acc;
        }, {
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          totalTimeSpent: 0,
          categoryBreakdown: new Set<string>(),
          priorityBreakdown: new Set<string>()
        });

        const completionRate = totals.totalTasks > 0
          ? Math.round((totals.completedTasks / totals.totalTasks) * 100)
          : 0;

        return {
          totalTasks: totals.totalTasks,
          completedTasks: totals.completedTasks,
          overdueTasks: totals.overdueTasks,
          completionRate,
          avgCompletionTime: totals.totalTasks > 0
            ? Math.round((totals.totalTimeSpent / totals.totalTasks) * 10) / 10
            : 0,
          totalTimeSpent: Math.round(totals.totalTimeSpent),
          categoryBreakdown: Array.from(totals.categoryBreakdown),
          priorityBreakdown: Array.from(totals.priorityBreakdown)
        };
      };

      const shouldFallback = !summary.totalTasks || summary.totalTasks === 0;
      setStats(shouldFallback ? deriveFallbackStats() : summary);
      setRecentTasks(tasksResponse.data.tasks);
      
      // Mock achievements data
      setAchievements([
        {
          id: '1',
          name: 'Task Master',
          description: 'Complete 10 tasks',
          icon: '🎯',
          progress: statsResponse.data.completedTasks,
          maxProgress: 10,
          isUnlocked: statsResponse.data.completedTasks >= 10
        },
        {
          id: '2',
          name: 'Streak Champion',
          description: 'Complete tasks for 7 days straight',
          icon: '🔥',
          progress: 3,
          maxProgress: 7,
          isUnlocked: false
        },
        {
          id: '3',
          name: 'Category Explorer',
          description: 'Complete tasks in 5 different categories',
          icon: '🌟',
          progress: new Set(statsResponse.data.categoryBreakdown).size,
          maxProgress: 5,
          isUnlocked: new Set(statsResponse.data.categoryBreakdown).size >= 5
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchMotivationalMessage = async () => {
    try {
      // Get time-based greeting and emoji
      const hour = new Date().getHours();
      let timeEmoji = '🌅';
      let timeGreeting = 'morning';
      
      if (hour >= 5 && hour < 12) {
        timeEmoji = '🌅';
        timeGreeting = 'morning';
      } else if (hour >= 12 && hour < 17) {
        timeEmoji = '☀️';
        timeGreeting = 'afternoon';
      } else if (hour >= 17 && hour < 21) {
        timeEmoji = '🌆';
        timeGreeting = 'evening';
      } else {
        timeEmoji = '🌙';
        timeGreeting = 'night';
      }

      // Calculate productivity level
      if (stats) {
        const completionRate = stats.completionRate || 0;
        let message = '';

                  if (completionRate >= 80) {
            const messages = [
              `Outstanding ${timeGreeting}! ${timeEmoji} You're crushing it with ${completionRate}% completion rate! 🚀`,
              `Incredible ${timeGreeting}! ${timeEmoji} ${completionRate}% tasks completed - you're on fire! 🔥`,
              `Amazing ${timeGreeting}! ${timeEmoji} Keep this momentum going, productivity champion! 💪`
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
          } else if (completionRate >= 60) {
            const messages = [
              `Good ${timeGreeting}! ${timeEmoji} You're at ${completionRate}% - let's push for more! 💫`,
              `Nice ${timeGreeting}! ${timeEmoji} Solid progress at ${completionRate}% - keep it up! ⭐`,
              `Great ${timeGreeting}! ${timeEmoji} You're doing well - let's make today count! 🎯`
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
          } else if (completionRate >= 40) {
            const messages = [
              `Good ${timeGreeting}! ${timeEmoji} Let's boost that ${completionRate}% completion rate today! 💪`,
              `Welcome back! ${timeEmoji} Time to turn that ${completionRate}% into success! 🌟`,
              `Hey there! ${timeEmoji} Every task counts - let's improve from ${completionRate}%! 📈`
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
          } else {
            const messages = [
              `Good ${timeGreeting}! ${timeEmoji} Fresh start - let's make today productive! 🌱`,
              `Welcome! ${timeEmoji} Today is full of possibilities - let's get started! ✨`,
              `Hey! ${timeEmoji} Small steps lead to big achievements - you've got this! 🎯`
            ];
            message = messages[Math.floor(Math.random() * messages.length)];
          }

        setMotivationalMessage(message);
      } else {
        setMotivationalMessage(`Good ${timeGreeting}! ${timeEmoji} Ready to make today amazing? Let's go! 🚀`);
      }
    } catch (error) {
      console.error('Error generating motivational message:', error);
      const hour = new Date().getHours();
      const timeEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙';
      setMotivationalMessage(`Welcome back! ${timeEmoji} Let's make today productive! 💪`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting_morning');
    if (hour < 18) return t('dashboard.greeting_afternoon');
    return t('dashboard.greeting_evening');
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      work: '💼',
      personal: '🏠',
      health: '❤️',
      learning: '📚',
      social: '👥',
      finance: '💰',
      home: '🏡',
      other: '📋'
    };
    return emojis[category] || '📋';
  };

  const openTasks = (params = '') => navigate(`/tasks${params}`);
  const openAnalytics = () => navigate('/analytics');
  const openAchievements = () => navigate('/achievements');
  const openTaskPreview = (task: RecentTask) => setSelectedRecentTask(task);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row justify-between items-start md:items-center"
          >
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {getGreeting()}, {user?.name}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Here's your productivity overview</p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              
              <button
                onClick={() => openTaskModal()}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>New Task</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 mb-8 text-white"
        >
          <div className="flex items-center space-x-3">
            <Sparkles className="w-6 h-6" />
            <p className="text-lg font-medium">{motivationalMessage}</p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => openTasks()}
            role="button"
            tabIndex={0}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('dashboard.totalTasks')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalTasks || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => openTasks('?status=completed')}
            role="button"
            tabIndex={0}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('dashboard.completed')}</p>
                <p className="text-3xl font-bold text-green-600">{stats?.completedTasks || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            onClick={openAnalytics}
            role="button"
            tabIndex={0}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('dashboard.completionRate')}</p>
                <p className={`text-3xl font-bold ${getCompletionColor(stats?.completionRate || 0)}`}>
                  {stats?.completionRate || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={openAnalytics}
            role="button"
            tabIndex={0}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('dashboard.timeSpent')}</p>
                <p className="text-3xl font-bold text-orange-600">
                  {Math.round((stats?.totalTimeSpent || 0) / 60)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('dashboard.recentTasks')}</h2>
              <Link
                to="/tasks"
                className="flex items-center space-x-1 text-purple-600 hover:text-purple-800 transition-colors"
              >
                <span className="text-sm font-medium">{t('common.viewAll')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentTasks.map((task, index) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => openTaskPreview(task)}
                  role="button"
                  tabIndex={0}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400"
                >
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getCategoryEmoji(task.category)}</span>
                      <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {recentTasks.length === 0 && (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No tasks yet</p>
                <button
                  onClick={() => openTaskModal()}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create your first task</span>
                </button>
              </div>
            )}
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{t('dashboard.achievements')}</h2>
              <Award className="w-6 h-6 text-yellow-500" />
            </div>

            <div className="space-y-4">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={openAchievements}
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-xl border-2 ${
                    achievement.isUnlocked 
                      ? 'border-yellow-200 bg-yellow-50' 
                      : 'border-gray-200 bg-gray-50'
                  } cursor-pointer hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`text-2xl ${achievement.isUnlocked ? '' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium ${
                        achievement.isUnlocked ? 'text-yellow-800' : 'text-gray-600'
                      }`}>
                        {achievement.name}
                      </h3>
                      <p className="text-sm text-gray-500">{achievement.description}</p>
                      
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round((achievement.progress / achievement.maxProgress) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              achievement.isUnlocked 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min((achievement.progress / achievement.maxProgress) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('dashboard.quickActions')}</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/tasks"
              className="flex flex-col items-center space-y-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">My Tasks</span>
            </Link>

            <Link
              to="/calendar"
              className="flex flex-col items-center space-y-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Calendar</span>
            </Link>

            <Link
              to="/analytics"
              className="flex flex-col items-center space-y-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Analytics</span>
            </Link>

            <Link
              to="/challenges"
              className="flex flex-col items-center space-y-2 p-4 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Challenges</span>
            </Link>

            <button
              onClick={() => setShowFixMyDay(true)}
              className="flex flex-col items-center space-y-2 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Navigation className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Fix My Day</span>
            </button>

            <button
              onClick={() => setShowPlanMyDay(true)}
              className="flex flex-col items-center space-y-2 p-4 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-pink-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">Plan My Day</span>
            </button>

            <Link
              to="/habits"
              className="flex flex-col items-center space-y-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white text-xl">🔥</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Habits</span>
            </Link>
          </div>
        </motion.div>

        {/* Fix My Day Modal */}
        <FixMyDayModal isOpen={showFixMyDay} onClose={() => setShowFixMyDay(false)} />

        {/* Plan My Day Modal */}
        <PlanMyDay isOpen={showPlanMyDay} onClose={() => setShowPlanMyDay(false)} />

        {/* Recent Task Preview */}
        <AnimatePresence>
          {selectedRecentTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setSelectedRecentTask(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Recent Task Preview</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedRecentTask.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {getCategoryEmoji(selectedRecentTask.category)} {selectedRecentTask.category}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedRecentTask(null)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-gray-500">Due</div>
                      <div className="font-medium text-gray-900">{new Date(selectedRecentTask.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-gray-500">Progress</div>
                      <div className="font-medium text-gray-900">{selectedRecentTask.progress.percentage}%</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>Priority: {selectedRecentTask.priority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Clock className="w-4 h-4" />
                      <span>Status: {selectedRecentTask.status}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const task = selectedRecentTask;
                        if (!task) return;
                        setSelectedRecentTask(null);
                        openTasks(`?search=${encodeURIComponent(task.title)}`);
                      }}
                      className="flex-1 rounded-xl bg-purple-600 px-4 py-3 text-white font-medium hover:bg-purple-700"
                    >
                      Open in Tasks
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecentTask(null);
                        setShowFixMyDay(true);
                      }}
                      className="flex-1 rounded-xl border border-purple-200 px-4 py-3 text-purple-700 font-medium hover:bg-purple-50"
                    >
                      Fix My Day
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DashboardPage; 
