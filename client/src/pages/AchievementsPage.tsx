import React, { useState } from 'react';
import { 
  Award, 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Users,
  Flame,
  Shield,
  Crown,
  Lock
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'productivity' | 'streak' | 'social' | 'milestone' | 'special';
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  xpReward: number;
  color: string;
}

const AchievementsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userStats] = useState({
    totalXP: 2450,
    level: 12,
    xpToNextLevel: 350,
    unlockedAchievements: 18,
    totalAchievements: 45
  });

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Steps',
      description: 'Complete your first task',
      icon: <CheckCircle className="w-6 h-6" />,
      category: 'milestone',
      difficulty: 'bronze',
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      unlockedAt: new Date('2024-01-10'),
      xpReward: 50,
      color: 'text-green-600'
    },
    {
      id: '2',
      title: 'Week Warrior',
      description: 'Complete all tasks for 7 consecutive days',
      icon: <Flame className="w-6 h-6" />,
      category: 'streak',
      difficulty: 'gold',
      progress: 7,
      maxProgress: 7,
      unlocked: true,
      unlockedAt: new Date('2024-01-15'),
      xpReward: 200,
      color: 'text-orange-600'
    },
    {
      id: '3',
      title: 'Speed Demon',
      description: 'Complete 10 tasks in under 30 minutes each',
      icon: <Zap className="w-6 h-6" />,
      category: 'productivity',
      difficulty: 'silver',
      progress: 8,
      maxProgress: 10,
      unlocked: false,
      xpReward: 150,
      color: 'text-yellow-600'
    },
    {
      id: '4',
      title: 'Early Bird',
      description: 'Complete tasks before 8 AM for 5 days',
      icon: <Clock className="w-6 h-6" />,
      category: 'productivity',
      difficulty: 'silver',
      progress: 3,
      maxProgress: 5,
      unlocked: false,
      xpReward: 120,
      color: 'text-blue-600'
    },
    {
      id: '5',
      title: 'Century Club',
      description: 'Complete 100 tasks total',
      icon: <Trophy className="w-6 h-6" />,
      category: 'milestone',
      difficulty: 'gold',
      progress: 76,
      maxProgress: 100,
      unlocked: false,
      xpReward: 300,
      color: 'text-purple-600'
    },
    {
      id: '6',
      title: 'Team Player',
      description: 'Complete 5 collaborative tasks',
      icon: <Users className="w-6 h-6" />,
      category: 'social',
      difficulty: 'bronze',
      progress: 2,
      maxProgress: 5,
      unlocked: false,
      xpReward: 100,
      color: 'text-indigo-600'
    },
    {
      id: '7',
      title: 'Perfect Month',
      description: 'Complete all planned tasks for an entire month',
      icon: <Calendar className="w-6 h-6" />,
      category: 'streak',
      difficulty: 'platinum',
      progress: 0,
      maxProgress: 1,
      unlocked: false,
      xpReward: 500,
      color: 'text-pink-600'
    },
    {
      id: '8',
      title: 'Productivity Master',
      description: 'Maintain 90%+ productivity score for 2 weeks',
      icon: <TrendingUp className="w-6 h-6" />,
      category: 'productivity',
      difficulty: 'platinum',
      progress: 0,
      maxProgress: 14,
      unlocked: false,
      xpReward: 400,
      color: 'text-emerald-600'
    },
    {
      id: '9',
      title: 'Challenge Champion',
      description: 'Win 3 sponsored challenges',
      icon: <Crown className="w-6 h-6" />,
      category: 'special',
      difficulty: 'gold',
      progress: 1,
      maxProgress: 3,
      unlocked: false,
      xpReward: 250,
      color: 'text-amber-600'
    },
    {
      id: '10',
      title: 'Consistency King',
      description: 'Maintain a 30-day streak',
      icon: <Shield className="w-6 h-6" />,
      category: 'streak',
      difficulty: 'platinum',
      progress: 7,
      maxProgress: 30,
      unlocked: false,
      xpReward: 600,
      color: 'text-red-600'
    }
  ];

  const categories = [
    { id: 'all', name: 'All', icon: <Award className="w-4 h-4" /> },
    { id: 'productivity', name: 'Productivity', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'streak', name: 'Streaks', icon: <Flame className="w-4 h-4" /> },
    { id: 'milestone', name: 'Milestones', icon: <Trophy className="w-4 h-4" /> },
    { id: 'social', name: 'Social', icon: <Users className="w-4 h-4" /> },
    { id: 'special', name: 'Special', icon: <Star className="w-4 h-4" /> }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAchievements = achievements.filter(achievement => 
    selectedCategory === 'all' || achievement.category === selectedCategory
  );

  const getProgressPercentage = (progress: number, maxProgress: number) => {
    return Math.min((progress / maxProgress) * 100, 100);
  };

  const getLevelProgress = () => {
    const currentLevelXP = userStats.level * 200; // Assuming 200 XP per level
    const nextLevelXP = (userStats.level + 1) * 200;
    const progress = userStats.totalXP - currentLevelXP;
    const maxProgress = nextLevelXP - currentLevelXP;
    return (progress / maxProgress) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 pt-14">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Achievements</h1>
          </div>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Level</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.level}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress to Level {userStats.level + 1}</span>
                <span>{userStats.xpToNextLevel} XP left</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getLevelProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total XP</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.totalXP.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Unlocked</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.unlockedAchievements}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((userStats.unlockedAchievements / userStats.totalAchievements) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.icon}
                <span>{category.name}</span>
                <span className="text-xs bg-black bg-opacity-20 px-2 py-1 rounded-full">
                  {category.id === 'all' 
                    ? achievements.length 
                    : achievements.filter(a => a.category === category.id).length
                  }
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map(achievement => (
            <div
              key={achievement.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md ${
                achievement.unlocked ? '' : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${
                  achievement.unlocked 
                    ? 'bg-purple-100' 
                    : 'bg-gray-100'
                }`}>
                  {achievement.unlocked ? (
                    <div className={achievement.color}>
                      {achievement.icon}
                    </div>
                  ) : (
                    <Lock className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    getDifficultyColor(achievement.difficulty)
                  }`}>
                    {achievement.difficulty.charAt(0).toUpperCase() + achievement.difficulty.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">+{achievement.xpReward} XP</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className={`text-lg font-semibold mb-2 ${
                  achievement.unlocked ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {achievement.title}
                </h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className={`font-medium ${
                    achievement.unlocked ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    {achievement.progress}/{achievement.maxProgress}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      achievement.unlocked ? 'bg-green-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${getProgressPercentage(achievement.progress, achievement.maxProgress)}%` }}
                  ></div>
                </div>
                {achievement.unlocked && achievement.unlockedAt && (
                  <p className="text-xs text-green-600 mt-2">
                    Unlocked on {achievement.unlockedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Achievements */}
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Recent Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements
              .filter(a => a.unlocked && a.unlockedAt)
              .sort((a, b) => (b.unlockedAt!.getTime() - a.unlockedAt!.getTime()))
              .slice(0, 4)
              .map(achievement => (
                <div key={achievement.id} className="bg-white rounded-lg p-4 flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <div className={achievement.color}>
                      {achievement.icon}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-600">
                      {achievement.unlockedAt!.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-purple-600">
                    +{achievement.xpReward} XP
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Next Achievements */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Almost There!</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements
              .filter(a => !a.unlocked && a.progress > 0)
              .sort((a, b) => (b.progress / b.maxProgress) - (a.progress / a.maxProgress))
              .slice(0, 4)
              .map(achievement => (
                <div key={achievement.id} className="bg-gray-50 rounded-lg p-4 flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{achievement.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${getProgressPercentage(achievement.progress, achievement.maxProgress)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementsPage; 