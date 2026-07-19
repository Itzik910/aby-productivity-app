import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Target, Calendar, BarChart3, Trophy, Navigation, Home, Award, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useTaskModalStore } from '../stores/taskModalStore';
import { useLanguageStore } from '../stores/languageStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNLP?: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  group: 'pages' | 'actions' | 'tasks';
}

interface TaskResult {
  _id: string;
  title: string;
  category: string;
  priority: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenNLP }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openTaskModal = useTaskModalStore((s) => s.openModal);
  const { isRtl } = useLanguageStore();

  const [query, setQuery] = useState('');
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const staticCommands: CommandItem[] = [
    {
      id: 'go-dashboard',
      label: t('nav.dashboard'),
      icon: <Home className="w-4 h-4" />,
      action: () => { navigate('/dashboard'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-tasks',
      label: t('nav.tasks'),
      icon: <Target className="w-4 h-4" />,
      action: () => { navigate('/tasks'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-calendar',
      label: t('nav.calendar'),
      icon: <Calendar className="w-4 h-4" />,
      action: () => { navigate('/calendar'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-analytics',
      label: t('nav.analytics'),
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => { navigate('/analytics'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-achievements',
      label: t('nav.achievements'),
      icon: <Award className="w-4 h-4" />,
      action: () => { navigate('/achievements'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-habits',
      label: 'Habits',
      icon: <Sparkles className="w-4 h-4" />,
      action: () => { navigate('/habits'); onClose(); },
      group: 'pages',
    },
    {
      id: 'go-challenges',
      label: t('nav.challenges'),
      icon: <Trophy className="w-4 h-4" />,
      action: () => { navigate('/challenges'); onClose(); },
      group: 'pages',
    },
    {
      id: 'action-new-task',
      label: t('common.newTask'),
      description: t('tasks.createTask'),
      icon: <Plus className="w-4 h-4" />,
      action: () => { openTaskModal(); onClose(); },
      group: 'actions',
    },
    {
      id: 'action-nlp-task',
      label: 'Add task with AI',
      description: 'Describe task in plain language',
      icon: <Sparkles className="w-4 h-4" />,
      action: () => { onOpenNLP?.(); },
      group: 'actions',
    },
    {
      id: 'action-fix-my-day',
      label: t('nav.fixMyDay'),
      icon: <Navigation className="w-4 h-4" />,
      action: () => { navigate('/dashboard'); onClose(); },
      group: 'actions',
    },
  ];

  // Filter static commands
  const filteredCommands = query
    ? staticCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(query.toLowerCase())
      )
    : staticCommands;

  // Search tasks with debounce
  const searchTasks = useCallback(async (q: string) => {
    if (!q.trim()) { setTaskResults([]); return; }
    try {
      const res = await api.get(`/tasks?search=${encodeURIComponent(q)}&limit=5`);
      setTaskResults(res.data.tasks || []);
    } catch {
      setTaskResults([]);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchTasks(query), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, searchTasks]);

  const taskCommands: CommandItem[] = taskResults.map((task) => ({
    id: `task-${task._id}`,
    label: task.title,
    description: `${task.category} · ${task.priority}`,
    icon: <Target className="w-4 h-4" />,
    action: () => {
      navigate(`/tasks?search=${encodeURIComponent(task.title)}`);
      onClose();
    },
    group: 'tasks',
  }));

  const allItems = [...filteredCommands, ...taskCommands];

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => (s + 1) % Math.max(allItems.length, 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => (s - 1 + Math.max(allItems.length, 1)) % Math.max(allItems.length, 1)); }
      if (e.key === 'Enter' && allItems[selected]) { allItems[selected].action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, allItems, selected, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const groupLabel: Record<string, string> = {
    pages: t('commandPalette.pages'),
    actions: t('commandPalette.actions'),
    tasks: t('commandPalette.tasks'),
  };

  let globalIdx = -1;

  const renderGroup = (group: 'pages' | 'actions' | 'tasks', items: CommandItem[]) => {
    if (items.length === 0) return null;
    return (
      <div key={group}>
        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {groupLabel[group]}
        </div>
        {items.map((item) => {
          globalIdx++;
          const idx = globalIdx;
          const isSelected = selected === idx;
          return (
            <button
              key={item.id}
              onMouseEnter={() => setSelected(idx)}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isSelected
                  ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`flex-shrink-0 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-start">{item.label}</span>
              {item.description && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{item.description}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const pageItems = filteredCommands.filter((c) => c.group === 'pages');
  const actionItems = filteredCommands.filter((c) => c.group === 'actions');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/40 flex items-start justify-center pt-[15vh] px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            dir={isRtl ? 'rtl' : 'ltr'}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                placeholder={t('commandPalette.placeholder')}
                className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-sm"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto py-1">
              {allItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                  {t('commandPalette.noResults')}
                </div>
              ) : (
                <>
                  {(() => { globalIdx = -1; return null; })()}
                  {renderGroup('pages', pageItems)}
                  {renderGroup('actions', actionItems)}
                  {renderGroup('tasks', taskCommands)}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
