import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Clock, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  initialDate?: Date;
}

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', bg: 'bg-red-500', ring: 'ring-red-400' },
  { value: 'high', label: 'High', bg: 'bg-orange-400', ring: 'ring-orange-300' },
  { value: 'medium', label: 'Medium', bg: 'bg-yellow-400', ring: 'ring-yellow-300' },
];

const CATEGORIES = [
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'personal', label: 'Personal', icon: '🏠' },
  { value: 'health', label: 'Health', icon: '❤️' },
  { value: 'learning', label: 'Learning', icon: '📚' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'home', label: 'Home', icon: '🏡' },
  { value: 'other', label: 'Other', icon: '📋' },
];

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(
    initialDate ? initialDate.toISOString().split('T')[0] : ''
  );
  const [priority, setPriority] = useState('');
  const [showMore, setShowMore] = useState(false);

  // "More options" fields
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [locationName, setLocationName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (initialDate) {
      setDueDate(initialDate.toISOString().split('T')[0]);
    }
  }, [initialDate]);

  const resetForm = () => {
    setTitle('');
    setDueDate('');
    setPriority('');
    setShowMore(false);
    setDescription('');
    setCategory('personal');
    setEstimatedDuration('');
    setLocationName('');
    setTagInput('');
    setTags([]);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const canCreate = title.trim().length > 0 && priority !== '';

  const createTask = async () => {
    if (!canCreate) return;

    try {
      const taskData = {
        title: title.trim(),
        description,
        category,
        priority,
        dueDate: dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
        tags,
        location: locationName.trim() ? { name: locationName.trim(), address: '' } : undefined,
      };

      await api.post('/tasks', taskData);
      toast.success('Task created! 🎉');
      resetForm();
      onClose();
      onTaskCreated?.();
      window.dispatchEvent(new Event('taskCreated'));
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  if (!isOpen) return null;

  const titleHasText = title.trim().length > 0;

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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">New Task</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* Title – always visible */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              autoFocus
              className="w-full text-lg font-medium border-0 border-b-2 border-gray-200 focus:border-purple-500 focus:outline-none pb-2 placeholder-gray-400 transition-colors"
            />

            {/* Due date row – appears once title has text */}
            <AnimatePresence>
              {titleHasText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Priority squares – appears once title has text */}
            <AnimatePresence>
              {titleHasText && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <p className="text-sm font-medium text-gray-600 mb-2">Priority</p>
                  <div className="flex gap-3">
                    {PRIORITY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPriority(opt.value)}
                        className={`flex-1 h-10 rounded-lg font-semibold text-white text-sm transition-all
                          ${opt.bg}
                          ${priority === opt.value
                            ? `ring-2 ${opt.ring} ring-offset-2 scale-105 shadow-md`
                            : 'opacity-70 hover:opacity-100'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* More options toggle */}
            <AnimatePresence>
              {titleHasText && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => setShowMore(!showMore)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 transition-colors"
                  >
                    {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showMore ? 'Fewer options' : 'More options'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expanded "more options" */}
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Add details..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Category + Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        Duration (min)
                      </label>
                      <input
                        type="number"
                        value={estimatedDuration}
                        onChange={e => setEstimatedDuration(e.target.value)}
                        placeholder="60"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={e => setLocationName(e.target.value)}
                      placeholder="Home, Office, Library..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="flex items-center gap-1 text-sm font-medium text-gray-600 mb-1">
                      <Tag className="w-3.5 h-3.5" />
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Press Enter to add..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            #{tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-purple-900">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createTask}
              disabled={!canCreate}
              className={`px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all
                ${canCreate
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-sm hover:shadow-md'
                  : 'bg-gray-300 cursor-not-allowed'
                }`}
            >
              Create Task
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateTaskModal;
