import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  AlertCircle,
  CheckCircle,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useTaskModalStore } from '../stores/taskModalStore';
import toast from 'react-hot-toast';
import MobileCalendarView from '../components/mobile/MobileCalendarView';
import { MobileTask, isTaskDone } from '../utils/taskDisplay';

interface Task {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: string;
  location?: {
    name: string;
    address: string;
  };
  estimatedDuration?: number;
  progress: {
    percentage: number;
  };
}

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [popupTask, setPopupTask] = useState<Task | null>(null);
  const openTaskModal = useTaskModalStore(state => state.openModal);

  // Fetch real tasks from API
  useEffect(() => {
    fetchTasks();
  }, []);

  // Refresh tasks when a new task is created
  useEffect(() => {
    const handleTaskCreated = () => {
      fetchTasks();
    };
    window.addEventListener('taskCreated', handleTaskCreated);
    return () => window.removeEventListener('taskCreated', handleTaskCreated);
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks');
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  const getStartOfWeek = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'pending': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return null;
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

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTasks = getTasksForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          } ${isSelected ? 'bg-purple-50 border-purple-300' : ''}`}
          onClick={() => setSelectedDate(date)}
          onDoubleClick={() => openTaskModal(date)}
          title="Double-click to add task"
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="mt-1 space-y-1">
            {dayTasks.slice(0, 2).map(task => (
              <div
                key={task._id}
                onClick={(e) => { e.stopPropagation(); setPopupTask(task); }}
                className={`text-xs p-1 rounded truncate ${getPriorityColor(task.priority)} text-white cursor-pointer hover:opacity-90 transition-opacity`}
              >
                {task.title}
              </div>
            ))}
            {dayTasks.length > 2 && (
              <div className="text-xs text-gray-500">
                +{dayTasks.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return <div className="grid grid-cols-7">{days}</div>;
  };

  const renderWeekGrid = () => {
    const weekStart = getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day;
    });

    return (
      <div className="grid grid-cols-7">
        {weekDays.map(day => {
          const dayTasks = getTasksForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={day.toISOString()}
              className={`min-h-16 sm:min-h-24 md:min-h-32 border border-gray-200 p-1 sm:p-2 cursor-pointer hover:bg-gray-50 ${
                isToday ? 'bg-blue-50 border-blue-300' : ''
              } ${isSelected ? 'bg-purple-50 border-purple-300' : ''}`}
              onClick={() => setSelectedDate(day)}
              onDoubleClick={() => openTaskModal(day)}
              title="Double-click to add task"
            >
              <div className="flex items-center justify-between mb-1 sm:mb-3">
                <div className={`text-[10px] sm:text-sm font-semibold hidden sm:block ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {dayNames[day.getDay()]}
                </div>
                <div className={`text-xs sm:text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>{day.getDate()}</div>
              </div>
              <div className="space-y-0.5 sm:space-y-2">
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task._id}
                    onClick={(e) => { e.stopPropagation(); setPopupTask(task); }}
                    className={`text-[10px] sm:text-xs p-0.5 sm:p-2 rounded sm:rounded-lg truncate ${getPriorityColor(task.priority)} text-white cursor-pointer hover:opacity-90 transition-opacity`}
                  >
                    <span className="hidden sm:inline">{task.title}</span>
                    <span className="sm:hidden">●</span>
                  </div>
                ))}
                {dayTasks.length > 4 && (
                  <div className="text-xs text-gray-500">
                    +{dayTasks.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <MobileCalendarView tasks={tasks as unknown as MobileTask[]} onToggle={toggleTaskMobile} />
      <div className="hidden min-h-screen bg-gray-50 dark:bg-gray-900 p-6 pt-14 md:block">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-700 min-w-[200px] text-center">
                {view === 'month'
                  ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : `${getStartOfWeek(currentDate).toLocaleDateString()} - ${new Date(getStartOfWeek(currentDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                }
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* View Toggle */}
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
            </div>

            {/* Add Task Button */}
            <button
              onClick={() => openTaskModal()}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 min-w-[560px]">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-700 bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="min-w-[560px]">
                {view === 'month' ? renderCalendarGrid() : renderWeekGrid()}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Today's Tasks */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Tasks</h3>
              <div className="space-y-3">
                {getTasksForDate(new Date()).length > 0 ? (
                  getTasksForDate(new Date()).map(task => (
                    <div key={task._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getStatusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></span>
                          <span className="text-xs text-gray-500">{task.category}</span>
                          {task.estimatedDuration && (
                            <span className="text-xs text-gray-500">• {task.estimatedDuration}min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No tasks for today</p>
                )}
              </div>
            </div>

            {/* Selected Date Tasks */}
            {selectedDate && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="space-y-3">
                  {getTasksForDate(selectedDate).length > 0 ? (
                    getTasksForDate(selectedDate).map(task => (
                      <div key={task._id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></span>
                              <span className="text-xs text-gray-500">{task.priority} priority</span>
                              {task.location?.name && (
                                <span className="flex items-center text-xs text-gray-500">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {task.location.name}
                                </span>
                              )}
                            </div>
                          </div>
                          {getStatusIcon(task.status)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500 text-sm mb-3">No tasks for this date</p>
                      <button
                        onClick={() => openTaskModal(selectedDate)}
                        className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Tasks</span>
                  <span className="text-sm font-medium text-gray-900">{filteredTasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">
                    {filteredTasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Progress</span>
                  <span className="text-sm font-medium text-blue-600">
                    {filteredTasks.filter(t => t.status === 'in_progress').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="text-sm font-medium text-orange-600">
                    {filteredTasks.filter(t => t.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Task Modal since we're using global modal */}

      {/* Task Detail Popup */}
      <AnimatePresence>
        {popupTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setPopupTask(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`h-2 w-full ${getPriorityColor(popupTask.priority)}`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug pr-2">
                    {popupTask.title}
                  </h3>
                  <button onClick={() => setPopupTask(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {popupTask.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{popupTask.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-xs text-gray-400 mb-0.5">Due</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {new Date(popupTask.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-xs text-gray-400 mb-0.5">Priority</div>
                    <div className={`font-medium capitalize ${
                      popupTask.priority === 'urgent' ? 'text-red-600'
                      : popupTask.priority === 'high' ? 'text-orange-600'
                      : popupTask.priority === 'medium' ? 'text-yellow-600'
                      : 'text-green-600'
                    }`}>{popupTask.priority}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-xs text-gray-400 mb-0.5">Category</div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">{popupTask.category}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <div className="text-xs text-gray-400 mb-0.5">Status</div>
                    <div className="font-medium text-gray-900 dark:text-white capitalize">
                      {popupTask.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {popupTask.location?.name && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{popupTask.location.name}</span>
                  </div>
                )}

                {popupTask.estimatedDuration && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{popupTask.estimatedDuration} min</span>
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{popupTask.progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${popupTask.progress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default CalendarPage; 
