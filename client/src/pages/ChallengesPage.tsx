import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  Star, 
  Medal, 
  Target, 
  Zap,
  Crown,
  Gift,
  TrendingUp,
  CheckCircle,
  Play,
  Search,
  Filter,
  ArrowRight,
  Award,
  Sparkles,
  Heart,
  MapPin,
  User
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import MobileProfileAvatar from '../components/mobile/MobileProfileAvatar';

interface Challenge {
  _id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  type: 'daily' | 'weekly' | 'monthly' | 'one-time' | 'ongoing';
  startDate: string;
  endDate: string;
  duration: number;
  maxParticipants?: number;
  currentParticipants: number;
  sponsor: {
    name: string;
    logo: string;
    website: string;
  };
  rewards: {
    points: {
      completion: number;
      participation: number;
    };
    prizes: Array<{
      rank: number;
      title: string;
      description: string;
      value: string;
    }>;
  };
  media: {
    banner: string;
    thumbnail: string;
  };
  analytics: {
    views: number;
    completionRate: number;
    averageRating: number;
  };
  userParticipation?: {
    status: string;
    progress: {
      tasksCompleted: number;
      totalTasks: number;
      pointsEarned: number;
      completionRate: number;
    };
  };
  isActive: boolean;
  canRegister: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  pointsEarned: number;
  completionRate: number;
  tasksCompleted: number;
  status: string;
}

const ChallengesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [featuredChallenges, setFeaturedChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const categories = [
    { value: 'productivity', label: 'Productivity', icon: '⚡', color: 'bg-blue-500' },
    { value: 'health', label: 'Health', icon: '❤️', color: 'bg-red-500' },
    { value: 'learning', label: 'Learning', icon: '📚', color: 'bg-purple-500' },
    { value: 'creativity', label: 'Creativity', icon: '🎨', color: 'bg-pink-500' },
    { value: 'fitness', label: 'Fitness', icon: '💪', color: 'bg-green-500' },
    { value: 'mindfulness', label: 'Mindfulness', icon: '🧘', color: 'bg-indigo-500' },
    { value: 'social', label: 'Social', icon: '👥', color: 'bg-yellow-500' },
    { value: 'environmental', label: 'Environmental', icon: '🌱', color: 'bg-emerald-500' }
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: 'text-green-600 bg-green-50' },
    { value: 'intermediate', label: 'Intermediate', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'advanced', label: 'Advanced', color: 'text-orange-600 bg-orange-50' },
    { value: 'expert', label: 'Expert', color: 'text-red-600 bg-red-50' }
  ];

  useEffect(() => {
    fetchChallenges();
    fetchFeaturedChallenges();
    if (user) {
      fetchMyChallenges();
    }
  }, [user]);

  const fetchChallenges = async () => {
    try {
      const response = await api.get('/sponsors/challenges');
      setChallenges(response.data.challenges);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      toast.error('Failed to load challenges');
      setLoading(false);
    }
  };

  const fetchFeaturedChallenges = async () => {
    try {
      const response = await api.get('/sponsors/challenges/featured');
      setFeaturedChallenges(response.data);
    } catch (error) {
      console.error('Error fetching featured challenges:', error);
    }
  };

  const fetchMyChallenges = async () => {
    try {
      const response = await api.get('/sponsors/my-challenges');
      setMyChallenges(response.data);
    } catch (error) {
      console.error('Error fetching my challenges:', error);
    }
  };

  const fetchLeaderboard = async (challengeId: string) => {
    try {
      const response = await api.get(`/sponsors/challenges/${challengeId}/leaderboard`);
      setLeaderboard(response.data);
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard');
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      await api.post(`/sponsors/challenges/${challengeId}/join`);
      toast.success('Successfully joined challenge! 🎉');
      fetchChallenges();
      fetchMyChallenges();
    } catch (error: any) {
      console.error('Error joining challenge:', error);
      toast.error(error.response?.data?.message || 'Failed to join challenge');
    }
  };

  const leaveChallenge = async (challengeId: string) => {
    try {
      await api.post(`/sponsors/challenges/${challengeId}/leave`);
      toast.success('Left challenge successfully');
      fetchChallenges();
      fetchMyChallenges();
    } catch (error) {
      console.error('Error leaving challenge:', error);
      toast.error('Failed to leave challenge');
    }
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[0];
  };

  const getDifficultyInfo = (difficulty: string) => {
    return difficulties.find(d => d.value === difficulty) || difficulties[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getFilteredChallenges = () => {
    let filtered = challenges;

    if (searchQuery) {
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.sponsor.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(challenge => challenge.category === filterCategory);
    }

    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(challenge => challenge.difficulty === filterDifficulty);
    }

    return filtered;
  };

  const renderChallengeCard = (challenge: Challenge) => {
    const categoryInfo = getCategoryInfo(challenge.category);
    const difficultyInfo = getDifficultyInfo(challenge.difficulty);
    const daysRemaining = getDaysRemaining(challenge.endDate);

    return (
      <motion.div
        key={challenge._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 overflow-hidden"
      >
        {/* Challenge Banner */}
        <div className="relative h-48 bg-gradient-to-r from-purple-600 to-blue-600">
          {challenge.media.banner && (
            <img 
              src={challenge.media.banner} 
              alt={challenge.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black bg-opacity-30"></div>
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color} text-white`}>
              {categoryInfo.icon} {categoryInfo.label}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyInfo.color}`}>
              {difficultyInfo.label}
            </div>
          </div>
          <div className="absolute top-4 right-4">
            <div className="flex items-center space-x-1 bg-black bg-opacity-50 rounded-full px-2 py-1">
              <Users className="w-4 h-4 text-white" />
              <span className="text-white text-sm">{challenge.currentParticipants}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Sponsor Info */}
          <div className="flex items-center space-x-3 mb-4">
            {challenge.sponsor.logo && (
              <img 
                src={challenge.sponsor.logo} 
                alt={challenge.sponsor.name}
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{challenge.sponsor.name}</p>
              <p className="text-xs text-gray-500">Sponsor</p>
            </div>
          </div>

          {/* Challenge Info */}
          <h3 className="text-xl font-bold text-gray-900 mb-2">{challenge.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{challenge.shortDescription}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-900">
                  {challenge.rewards.points.completion}
                </span>
              </div>
              <p className="text-xs text-gray-500">Points</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">{daysRemaining}</span>
              </div>
              <p className="text-xs text-gray-500">Days left</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-900">
                  {challenge.analytics.completionRate}%
                </span>
              </div>
              <p className="text-xs text-gray-500">Completion</p>
            </div>
          </div>

          {/* Progress (if participating) */}
          {challenge.userParticipation && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Your Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {challenge.userParticipation.progress.completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${challenge.userParticipation.progress.completionRate}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedChallenge(challenge);
                setShowChallengeModal(true);
              }}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 transition-colors"
            >
              <span className="text-sm font-medium">View Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchLeaderboard(challenge._id)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Medal className="w-4 h-4" />
              </button>

              {challenge.userParticipation ? (
                <button
                  onClick={() => leaveChallenge(challenge._id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  Leave
                </button>
              ) : (
                <button
                  onClick={() => joinChallenge(challenge._id)}
                  disabled={!challenge.canRegister}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {challenge.canRegister ? 'Join' : 'Full'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Mobile card layout ---------- */}
      <div className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-[21px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.challenges.title')}</h1>
              <p className="mt-1.5 text-[13px] font-medium text-aby-sub dark:text-aby-sub-dark">{t('mobile.challenges.intro')}</p>
            </div>
            <MobileProfileAvatar />
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {getFilteredChallenges().map((challenge) => {
              const joined = !!challenge.userParticipation;
              const progress = challenge.userParticipation?.progress?.completionRate || 0;
              const difficultyInfo = getDifficultyInfo(challenge.difficulty);
              const reward = challenge.rewards?.prizes?.[0]?.title || `${challenge.rewards?.points?.completion || 0} pts`;
              const daysLeft = getDaysRemaining(challenge.endDate);
              return (
                <div key={challenge._id} className="rounded-[20px] border border-aby-line bg-aby-card p-4 dark:border-aby-line-dark dark:bg-aby-card-dark">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-extrabold leading-snug text-aby-ink dark:text-aby-ink-dark">{challenge.title}</p>
                      <p className="mt-1 text-xs font-bold text-aby-teal dark:text-[#2FD3CE]">{challenge.sponsor?.name}</p>
                    </div>
                    <button
                      onClick={() => (joined ? leaveChallenge(challenge._id) : joinChallenge(challenge._id))}
                      className={`h-10 shrink-0 rounded-[13px] px-4 text-[13px] font-bold ${
                        joined
                          ? 'border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:text-aby-sub-dark'
                          : 'bg-aby-ink text-white dark:bg-white dark:text-aby-ink'
                      }`}
                    >
                      {joined ? t('mobile.challenges.joined') : t('mobile.challenges.join')}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-[9px] bg-aby-page px-2.5 py-1 text-[11.5px] font-semibold text-aby-sub dark:bg-aby-page-dark dark:text-aby-sub-dark">
                      {difficultyInfo.label} · {challenge.currentParticipants}
                    </span>
                    <span className="rounded-[9px] bg-[#FEF3C7] px-2.5 py-1 text-[11.5px] font-bold text-[#A15C07]">{reward}</span>
                    <span className="rounded-[9px] bg-aby-page px-2.5 py-1 text-[11.5px] font-semibold text-aby-sub dark:bg-aby-page-dark dark:text-aby-sub-dark">
                      {daysLeft > 0 ? `${daysLeft}d left` : 'Ending'}
                    </span>
                  </div>
                  {joined && (
                    <div className="mt-3 flex items-center gap-2.5">
                      <div className="h-[7px] flex-1 rounded-full bg-[#EFECF7]">
                        <div className="h-[7px] rounded-full bg-aby-violet" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[11.5px] font-bold text-aby-sub dark:text-aby-sub-dark">
                        {t('mobile.challenges.pctComplete', { pct: Math.round(progress) })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Desktop layout (unchanged) ---------- */}
      <div className="hidden min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pt-12 md:block">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            🏆 Sponsored Challenges
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Join brand-sponsored challenges, earn rewards, and compete with other users
          </motion.p>
        </div>

        {/* Featured Challenges */}
        {featuredChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <span>Featured Challenges</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredChallenges.map(challenge => renderChallengeCard(challenge))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
          {[
            { id: 'all', label: 'All Challenges', icon: Trophy },
            { id: 'my', label: 'My Challenges', icon: User, count: myChallenges.length },
            { id: 'active', label: 'Active', icon: Play },
            { id: 'completed', label: 'Completed', icon: CheckCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-white text-purple-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Difficulties</option>
            {difficulties.map(diff => (
              <option key={diff.value} value={diff.value}>{diff.label}</option>
            ))}
          </select>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'all' && getFilteredChallenges().map(challenge => renderChallengeCard(challenge))}
          {activeTab === 'my' && myChallenges.map(challenge => renderChallengeCard(challenge))}
          {activeTab === 'active' && getFilteredChallenges().filter(c => c.isActive).map(challenge => renderChallengeCard(challenge))}
          {activeTab === 'completed' && myChallenges.filter(c => c.userParticipation?.status === 'completed').map(challenge => renderChallengeCard(challenge))}
        </div>

        {/* Empty State */}
        {getFilteredChallenges().length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No challenges found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or check back later for new challenges
            </p>
          </div>
        )}
      </div>

      {/* Challenge Detail Modal */}
      <AnimatePresence>
        {showChallengeModal && selectedChallenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedChallenge.title}</h2>
                  <button
                    onClick={() => setShowChallengeModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600">{selectedChallenge.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Rewards</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Trophy className="w-5 h-5 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Completion</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">
                          {selectedChallenge.rewards.points.completion} pts
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Gift className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-blue-800">Participation</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedChallenge.rewards.points.participation} pts
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedChallenge.rewards.prizes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Prizes</h3>
                      <div className="space-y-2">
                        {selectedChallenge.rewards.prizes.map((prize, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                              {prize.rank}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{prize.title}</p>
                              <p className="text-sm text-gray-600">{prize.description}</p>
                            </div>
                            <div className="ml-auto">
                              <span className="text-sm font-medium text-green-600">{prize.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Duration</h3>
                      <p className="text-gray-600">{selectedChallenge.duration} days</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Participants</h3>
                      <p className="text-gray-600">{selectedChallenge.currentParticipants} joined</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowChallengeModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Close
                  </button>
                  {selectedChallenge.userParticipation ? (
                    <button
                      onClick={() => {
                        leaveChallenge(selectedChallenge._id);
                        setShowChallengeModal(false);
                      }}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Leave Challenge
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        joinChallenge(selectedChallenge._id);
                        setShowChallengeModal(false);
                      }}
                      disabled={!selectedChallenge.canRegister}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectedChallenge.canRegister ? 'Join Challenge' : 'Challenge Full'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <h2 className="text-2xl font-bold text-gray-900">Leaderboard</h2>
                  </div>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-4 p-4 rounded-lg ${
                        index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {entry.rank}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{entry.user.name}</p>
                        <p className="text-sm text-gray-600">
                          {entry.tasksCompleted} tasks • {entry.completionRate}% complete
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{entry.pointsEarned}</p>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  ))}
                </div>

                {leaderboard.length === 0 && (
                  <div className="text-center py-8">
                    <Medal className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No participants yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default ChallengesPage; 