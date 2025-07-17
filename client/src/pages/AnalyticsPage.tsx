import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  Calendar, 
  Award,
  Activity,
  Users,
  CheckCircle,
  AlertCircle,
  Timer,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard', {
        params: { timeRange }
      });
      
      // Transform the data to match our component structure
      const data = response.data.data;
      setAnalyticsData({
        productivity: data.productivity,
        tasks: data.tasks,
        streaks: data.streaks,
        timeSpent: data.timeSpent,
        categories: data.categories.map((cat: any) => ({
          name: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
          completed: cat.completed,
          total: cat.total,
          color: getCategoryColor(cat.name)
        })),
        weeklyProgress: data.weeklyProgress,
        insights: data.insights,
        peakHour: data.peakHour,
        averageTaskTime: data.averageTaskTime
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      work: 'bg-blue-500',
      personal: 'bg-green-500',
      health: 'bg-purple-500',
      learning: 'bg-yellow-500',
      social: 'bg-pink-500',
      finance: 'bg-orange-500',
      home: 'bg-indigo-500',
      other: 'bg-gray-500'
    };
    return colors[category.toLowerCase()] || 'bg-gray-500';
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    subtitle?: string;
  }> = ({ title, value, icon, change, changeType, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {change && (
          <div className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </div>
        )}
      </div>
    </div>
  );

  const ProgressBar: React.FC<{ percentage: number; color?: string }> = ({ 
    percentage, 
    color = 'bg-purple-500' 
  }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );

  const getCompletionRate = () => {
    const { completed, total } = analyticsData.tasks;
    return Math.round((completed / total) * 100);
  };

  const getProductivityTrend = () => {
    const current = analyticsData.productivity.weekly;
    const previous = 72; // Mock previous week data
    return current > previous ? 'positive' : current < previous ? 'negative' : 'neutral';
  };

  if (loading || !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Productivity Score"
            value={`${analyticsData.productivity.weekly}%`}
            icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
            change={`+${analyticsData.productivity.weekly - 72}%`}
            changeType={getProductivityTrend()}
            subtitle="vs last week"
          />
          
          <StatCard
            title="Tasks Completed"
            value={analyticsData.tasks.completed}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            change={`${getCompletionRate()}%`}
            changeType="positive"
            subtitle="completion rate"
          />
          
          <StatCard
            title="Current Streak"
            value={`${analyticsData.streaks.current} days`}
            icon={<Award className="w-5 h-5 text-yellow-600" />}
            change={`Best: ${analyticsData.streaks.longest}`}
            changeType="neutral"
            subtitle="longest streak"
          />
          
          <StatCard
            title="Time Spent"
            value={`${analyticsData.timeSpent.week}h`}
            icon={<Clock className="w-5 h-5 text-blue-600" />}
            change="+2.5h"
            changeType="positive"
            subtitle="this week"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Progress Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>Target</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {analyticsData.weeklyProgress.map((day: any, index: number) => (
                <div key={day.day} className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-medium text-gray-600">{day.day}</div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div 
                        className="bg-purple-500 h-6 rounded-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all duration-300"
                        style={{ width: `${(day.completed / day.target) * 100}%` }}
                      >
                        {day.completed > 0 && day.completed}
                      </div>
                    </div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      /{day.target}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Task Categories</h3>
            <div className="space-y-6">
              {analyticsData.categories.map((category: any, index: number) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${category.color}`}></div>
                      <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {category.completed}/{category.total}
                    </span>
                  </div>
                  <ProgressBar 
                    percentage={(category.completed / category.total) * 100}
                    color={category.color}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round((category.completed / category.total) * 100)}% complete
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Productivity Insights */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Productivity Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Peak Performance</p>
                  <p className="text-xs text-gray-600">
                    Your peak hour is {analyticsData.peakHour}:00 - 
                    {analyticsData.peakHour + 1}:00
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Average Task Time</p>
                  <p className="text-xs text-gray-600">
                    {analyticsData.averageTaskTime} minutes per task
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Completion Rate</p>
                  <p className="text-xs text-gray-600">
                    {getCompletionRate()}% of your tasks are completed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Distribution</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-sm text-gray-600">Work</span>
                </div>
                <span className="text-sm font-medium text-gray-900">24h (60%)</span>
              </div>
              <ProgressBar percentage={60} color="bg-blue-500" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Personal</span>
                </div>
                <span className="text-sm font-medium text-gray-900">12h (30%)</span>
              </div>
              <ProgressBar percentage={30} color="bg-green-500" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-sm text-gray-600">Health</span>
                </div>
                <span className="text-sm font-medium text-gray-900">6h (10%)</span>
              </div>
              <ProgressBar percentage={10} color="bg-purple-500" />
            </div>
          </div>

          {/* Recent Achievements */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Award className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Week Warrior</p>
                  <p className="text-xs text-gray-600">Completed all tasks this week</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Productivity Boost</p>
                  <p className="text-xs text-gray-600">15% improvement from last week</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Timer className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Time Master</p>
                  <p className="text-xs text-gray-600">Maintained 7-day streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Optimize Your Schedule</h4>
              <p className="text-sm text-gray-600">
                Consider scheduling important tasks during your peak performance hours (Tuesday mornings).
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Break Down Large Tasks</h4>
              <p className="text-sm text-gray-600">
                Your focus sessions average 45 minutes. Break larger tasks into smaller chunks for better completion rates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 