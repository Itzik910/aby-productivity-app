import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import TaskChecklist from '../components/TaskChecklist';
import TaskShareModal from '../components/TaskShareModal';
import PomodoroTimer from '../components/PomodoroTimer';
import { 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle,
  MoreVertical,
  Edit,
  Trash2,
  Target,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Users,
  Home,
  Wrench
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useTaskModalStore } from '../stores/taskModalStore';
import MobileTasksView from '../components/mobile/MobileTasksView';
import { MobileTask, isTaskDone } from '../utils/taskDisplay';

interface AISuggestion {
  header: string;
  details: string;
  type: 'location' | 'diy' | 'service' | 'timing' | 'collaboration';
  actionable: boolean;
}

interface FiveWay {
  wayId: number;
  wayTitle: string;
  type: string;
  estimatedMinutes: number;
  estimatedCostRange?: string;
  steps: string[];
  recommendedPlaces?: Array<{
    name: string;
    address: string;
    rating?: number | null;
    costText?: string;
    placeId?: string;
    mapsUrl?: string;
  }>;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: string;
  estimatedDuration?: number;
  progress: {
    percentage: number;
  };
  aiSuggestions: Array<{
    _id: string;
    suggestion: string;
    type: string;
    confidence: number;
    isSelected: boolean;
  }>;
  location?: {
    name: string;
    address: string;
  };
  tags: string[];
  steps: Array<{
    _id?: string;
    title: string;
    isCompleted: boolean;
    completedAt?: string;
    order: number;
  }>;
}

interface TaskEditForm {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  estimatedDuration: string;
  location: {
    name: string;
    address: string;
  };
}

const TasksPage: React.FC = () => {
  const FIVE_WAYS_TIMEOUT_MS = 60000;
  const location = useLocation();
  const openTaskModal = useTaskModalStore(state => state.openModal);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskMenuId, setShowTaskMenuId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskEditForm>({
    title: '',
    description: '',
    category: 'personal',
    priority: 'medium',
    dueDate: '',
    estimatedDuration: '',
    location: {
      name: '',
      address: ''
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState('dueDate');
  const [showFilters, setShowFilters] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [showFiveWays, setShowFiveWays] = useState(false);
  const [fiveWays, setFiveWays] = useState<FiveWay[]>([]);
  const [selectedWay, setSelectedWay] = useState<FiveWay | null>(null);
  const [loadingFiveWays, setLoadingFiveWays] = useState(false);
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const categories = [
    { value: 'work', label: 'Work', color: 'bg-blue-500', icon: '💼' },
    { value: 'personal', label: 'Personal', color: 'bg-green-500', icon: '🏠' },
    { value: 'health', label: 'Health', color: 'bg-red-500', icon: '❤️' },
    { value: 'learning', label: 'Learning', color: 'bg-purple-500', icon: '📚' },
    { value: 'social', label: 'Social', color: 'bg-pink-500', icon: '👥' },
    { value: 'finance', label: 'Finance', color: 'bg-yellow-500', icon: '💰' },
    { value: 'home', label: 'Home', color: 'bg-indigo-500', icon: '🏡' },
    { value: 'other', label: 'Other', color: 'bg-gray-500', icon: '📋' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50' }
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    const status = params.get('status');
    const category = params.get('category');

    if (search !== null) {
      setSearchQuery(search);
    }
    if (status) {
      setFilterStatus(status);
    }
    if (category) {
      setFilterCategory(category);
    }
  }, [location.search]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, filterStatus, filterCategory, filterPriority, sortBy]);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    // Priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'title':
          return a.title.localeCompare(b.title);
        case 'progress':
          return b.progress.percentage - a.progress.percentage;
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  };

  // Refresh tasks when modal creates a new task
  React.useEffect(() => {
    const handleTaskCreated = () => {
      fetchTasks();
    };
    window.addEventListener('taskCreated', handleTaskCreated);
    return () => window.removeEventListener('taskCreated', handleTaskCreated);
  }, []);

  const completeTask = async (taskId: string) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      setTasks(tasks.map(task => 
        task._id === taskId 
          ? { ...task, status: 'completed', progress: { percentage: 100 } }
          : task
      ));
      toast.success('Task completed! 🎉');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task');
    }
  };

  const toggleTaskMobile = async (task: MobileTask) => {
    const done = isTaskDone(task);
    setTasks((prev) =>
      prev.map((x) => (x._id === task._id ? { ...x, status: done ? 'pending' : 'completed' } as Task : x))
    );
    try {
      if (done) {
        await api.put(`/tasks/${task._id}`, { status: 'pending' });
      } else {
        await api.patch(`/tasks/${task._id}/complete`);
      }
    } catch {
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(task => task._id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const generateAISuggestions = async (task: Task) => {
    try {
      setGeneratingAI(true);
      const response = await api.post(`/tasks/${task._id}/ai-suggestions`);
      // The backend now returns structured suggestions directly
      setAiSuggestions(response.data);
      setSelectedTask(task);
      setExpandedSuggestion(null); // Reset expanded state
      setShowAISuggestions(true);
    } catch (error: any) {
      console.error('Error generating AI suggestions:', error);
      toast.error(error.response?.data?.message || 'Failed to generate ABY suggestions');
    } finally {
      setGeneratingAI(false);
    }
  };

  const generateFiveWays = async (task: Task) => {
    try {
      setLoadingFiveWays(true);
      setSelectedTask(task);
      setSelectedWay(null);
      setFiveWays([]);
      setShowFiveWays(true);
      const response = await api.get(`/tasks/${task._id}/five-ways`, {
        timeout: FIVE_WAYS_TIMEOUT_MS,
      });
      setFiveWays(response.data.ways || []);
    } catch (error: any) {
      console.error('Error generating five ways:', error);
      if (error.code === 'ECONNABORTED') {
        toast.error('ABY Help is taking longer than usual. Try again in a moment.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to generate ways');
      }
      setShowFiveWays(false);
    } finally {
      setLoadingFiveWays(false);
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTaskId(task._id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      estimatedDuration: task.estimatedDuration ? String(task.estimatedDuration) : '',
      location: {
        name: task.location?.name || '',
        address: task.location?.address || ''
      }
    });
    setShowTaskMenuId(null);
  };

  const saveEditedTask = async () => {
    if (!editingTaskId) return;

    try {
      if (!editForm.title.trim()) {
        toast.error('Please enter a task title');
        return;
      }

      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        priority: editForm.priority,
        dueDate: editForm.dueDate,
        estimatedDuration: editForm.estimatedDuration ? parseInt(editForm.estimatedDuration) : undefined,
        location: editForm.location.name.trim()
          ? {
              name: editForm.location.name.trim(),
              address: editForm.location.address.trim()
            }
          : undefined
      };

      const response = await api.put(`/tasks/${editingTaskId}`, payload);
      setTasks(tasks.map(task => (task._id === editingTaskId ? response.data : task)));
      toast.success('Task updated');
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const closeEditModal = () => {
    setEditingTaskId(null);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[categories.length - 1];
  };

  const getPriorityInfo = (priority: string) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
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
      <MobileTasksView tasks={tasks as unknown as MobileTask[]} onToggle={toggleTaskMobile} />
      <div className="hidden min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 pt-12 md:block">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Tasks</h1>
            <p className="text-gray-600">Organize your productivity with AI-powered suggestions</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => openTaskModal()}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Priorities</option>
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="dueDate">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                    <option value="progress">Progress</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const categoryInfo = getCategoryInfo(task.category);
            const priorityInfo = getPriorityInfo(task.priority);
            const overdue = isOverdue(task.dueDate);

            return (
              <motion.div
                key={task._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 ${
                  overdue ? 'ring-2 ring-red-200' : ''
                }`}
              >
                <div className="p-6">
                  {/* Task Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${categoryInfo.color}`}></div>
                      <span className="text-sm font-medium text-gray-600">{categoryInfo.icon} {categoryInfo.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTaskMenuId(showTaskMenuId === task._id ? null : task._id)}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {showTaskMenuId === task._id && (
                          <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => openEditTask(task)}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSharingTask(task);
                                setShowTaskMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Share
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                completeTask(task._id);
                                setShowTaskMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteTask(task._id);
                                setShowTaskMenuId(null);
                              }}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Content */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{task.description}</p>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Progress</span>
                        <span className="text-xs font-medium text-gray-700">{task.progress.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center space-x-2 mb-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {overdue && <AlertCircle className="w-4 h-4 inline mr-1" />}
                        {formatDate(task.dueDate)}
                      </span>
                    </div>

                    {/* Location */}
                    {task.location?.name && (
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{task.location.name}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Checklist */}
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <TaskChecklist
                        taskId={task._id}
                        steps={task.steps || []}
                        onUpdate={(steps, progress) => {
                          setTasks((prev) =>
                            prev.map((t) =>
                              t._id === task._id ? { ...t, steps, progress } : t
                            )
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => completeTask(task._id)}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Complete</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => generateFiveWays(task)}
                        disabled={loadingFiveWays}
                        className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm">ABY Help</span>
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.post(`/tasks/${task._id}/breakdown`);
                            setTasks((prev) =>
                              prev.map((t) => t._id === task._id ? { ...t, steps: res.data.steps, progress: res.data.progress } : t)
                            );
                            toast.success('Task broken down into steps!');
                          } catch {
                            toast.error('Failed to break down task');
                          }
                        }}
                        className="flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
                        title="AI: Break into steps"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Split</span>
                      </button>
                      <button
                        onClick={() => setFocusTask(task)}
                        className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                        title="Start Pomodoro focus session"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Focus</span>
                      </button>                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditTask(task)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => deleteTask(task._id)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Create your first task to get started with your productivity journey'
              }
            </p>
                          <button
                onClick={() => openTaskModal()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                Create Your First Task
              </button>
          </div>
        )}
      </div>



      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTaskId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Task</h2>
                  <button onClick={closeEditModal} className="p-2 hover:bg-gray-100 rounded-full">
                    <Edit className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskEditForm['priority'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {priorities.map(priority => (
                        <option key={priority.value} value={priority.value}>{priority.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
                    <input
                      type="number"
                      value={editForm.estimatedDuration}
                      onChange={(e) => setEditForm({ ...editForm, estimatedDuration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                    <input
                      type="text"
                      value={editForm.location.name}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        location: { ...editForm.location, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location Address</label>
                    <input
                      type="text"
                      value={editForm.location.address}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        location: { ...editForm.location, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={closeEditModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedTask}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {showAISuggestions && (
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
                <div className="flex items-center space-x-3 mb-6">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">ABY Suggestions</h2>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedTask?.title}</h3>
                  <p className="text-sm text-gray-600">Here are some ABY-powered suggestions to help you complete this task:</p>
                </div>

                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => {
                    const isExpanded = expandedSuggestion === index;
                    const typeIcons = {
                      location: MapPin,
                      diy: Home,
                      service: ExternalLink,
                      timing: Clock,
                      collaboration: Users
                    };
                    const TypeIcon = typeIcons[suggestion.type] || Wrench;
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedSuggestion(isExpanded ? null : index)}
                          className="w-full p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 transition-all duration-200 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-purple-600 text-white rounded-lg flex items-center justify-center">
                                <TypeIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{suggestion.header}</h4>
                                <span className="text-xs text-purple-600 font-medium capitalize">{suggestion.type}</span>
                              </div>
                            </div>
                            {isExpanded ? 
                              <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            }
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-white border-t border-gray-100"
                            >
                              <div className="p-4">
                                <p className="text-gray-700 leading-relaxed">{suggestion.details}</p>
                                <div className="mt-3 flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Actionable
                                  </span>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    suggestion.type === 'location' ? 'bg-blue-100 text-blue-800' :
                                    suggestion.type === 'diy' ? 'bg-orange-100 text-orange-800' :
                                    suggestion.type === 'service' ? 'bg-purple-100 text-purple-800' :
                                    suggestion.type === 'timing' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {suggestion.type}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAISuggestions(false);
                      setExpandedSuggestion(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowAISuggestions(false);
                      setExpandedSuggestion(null);
                      toast.success('AI suggestions noted!');
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
                  >
                    Apply Suggestions
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Five Ways Modal */}
      <AnimatePresence>
        {showFiveWays && (
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedWay ? selectedWay.wayTitle : 'ABY Help'}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      if (selectedWay) {
                        setSelectedWay(null);
                      } else {
                        setShowFiveWays(false);
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                  >
                    {selectedWay ? '← Back' : '✕'}
                  </button>
                </div>

                {!selectedWay && (
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedTask?.title} — choose a way to complete it
                  </p>
                )}

                {loadingFiveWays ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">ABY is thinking...</p>
                  </div>
                ) : selectedWay ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 capitalize">
                        {selectedWay.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">~{selectedWay.estimatedMinutes} min</span>
                      {selectedWay.estimatedCostRange && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          {selectedWay.estimatedCostRange}
                        </span>
                      )}
                    </div>
                    <ol className="space-y-3">
                      {selectedWay.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>

                    {selectedWay.recommendedPlaces && selectedWay.recommendedPlaces.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Suggested places</h4>
                        <div className="space-y-2">
                          {selectedWay.recommendedPlaces.map(place => (
                            <a
                              key={`${place.placeId || place.name}-${place.address}`}
                              href={place.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)} ${encodeURIComponent(place.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg border border-gray-200 p-3 hover:border-purple-300 hover:bg-purple-50 transition-colors"
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
                ) : (
                  <div className="space-y-3">
                    {fiveWays.map(way => (
                      <button
                        key={way.wayId}
                        type="button"
                        onClick={() => setSelectedWay(way)}
                        className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-purple-700 text-sm">
                              {way.wayTitle}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">
                              {way.type.replace(/_/g, ' ')} · ~{way.estimatedMinutes} min
                            </div>
                            {way.estimatedCostRange && (
                              <div className="text-xs text-green-600 mt-1">
                                Cost: {way.estimatedCostRange}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!loadingFiveWays && !selectedWay && (
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => setShowFiveWays(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Share Modal */}
      {sharingTask && (
        <TaskShareModal
          taskId={sharingTask._id}
          taskTitle={sharingTask.title}
          collaborators={(sharingTask as any).collaborators || []}
          isOpen={!!sharingTask}
          onClose={() => setSharingTask(null)}
          onUpdate={(collaborators) => {
            setTasks((prev) =>
              prev.map((t) => t._id === sharingTask._id ? { ...t, collaborators } as any : t)
            );
          }}
        />
      )}

      {/* Pomodoro Focus Timer */}
      <PomodoroTimer
        isOpen={!!focusTask}
        taskId={focusTask?._id}
        taskTitle={focusTask?.title}
        onClose={() => setFocusTask(null)}
      />
      </div>
    </>
  );
};

export default TasksPage;
