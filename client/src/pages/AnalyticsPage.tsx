import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  CheckCircle,
  Timer,
  Award,
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
  }> = ({ title, value, icon, change, changeType = 'neutral', subtitle }) => {
    const changeColor = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {icon}
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        {change && (
          <div className={`text-sm ${changeColor[changeType]}`}>
            {change}
          </div>
        )}
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
      </div>
    );
  };

  const getCompletionRate = () => {
    if (!analyticsData || analyticsData.tasks.total === 0) return 0;
    const { completed, total } = analyticsData.tasks;
    return Math.round((completed / total) * 100);
  };

  if (loading || !analyticsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          </div>
          
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

        {/* Key Metrics - Simplified */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Completed"
            value={analyticsData.tasks.completed}
            icon={<CheckCircle className="w-6 h-6 text-green-600" />}
            change={`${getCompletionRate()}% success rate`}
            changeType="positive"
            subtitle={`${analyticsData.tasks.total} total tasks`}
          />
          
          <StatCard
            title="Productivity"
            value={`${analyticsData.productivity.weekly}%`}
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            change="This week"
            changeType="neutral"
            subtitle="Weekly average"
          />
          
          <StatCard
            title="Streak"
            value={`${analyticsData.streaks.current} days`}
            icon={<Award className="w-6 h-6 text-yellow-600" />}
            change={`Best: ${analyticsData.streaks.longest} days`}
            changeType="neutral"
            subtitle="Current streak"
          />
          
          <StatCard
            title="Time This Week"
            value={`${analyticsData.timeSpent.week}h`}
            icon={<Clock className="w-6 h-6 text-blue-600" />}
            change={`Today: ${analyticsData.timeSpent.today}h`}
            changeType="neutral"
            subtitle="Total time"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Weekly Progress */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Progress</h3>
            <div className="space-y-3">
              {analyticsData.weeklyProgress.map((day: any) => (
                <div key={day.day} className="flex items-center space-x-4">
                  <div className="w-12 text-sm font-medium text-gray-600">{day.day}</div>
                  <div className="flex-1 relative">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((day.completed / day.target) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      {day.completed}/{day.target}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
            <div className="space-y-3">
              {analyticsData.categories.slice(0, 6).map((category: any) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                    <span className="text-sm text-gray-900">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {category.completed}/{category.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <Timer className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Peak Hour</p>
                <p className="text-xs text-gray-600">
                  Most productive at {analyticsData.peakHour}:00
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Average Task</p>
                <p className="text-xs text-gray-600">
                  {analyticsData.averageTaskTime} minutes duration
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Efficiency</p>
                <p className="text-xs text-gray-600">
                  {getCompletionRate()}% completion rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage; 