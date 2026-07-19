import React, { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Step {
  _id?: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  order: number;
}

interface TaskChecklistProps {
  taskId: string;
  steps: Step[];
  onUpdate: (steps: Step[], progress: { percentage: number }) => void;
}

const HINT_CACHE_KEY = (taskId: string, idx: number) => `aby-step-hint:${taskId}:${idx}`;

const TaskChecklist: React.FC<TaskChecklistProps> = ({ taskId, steps, onUpdate }) => {
  const { t } = useTranslation();
  const [newStepTitle, setNewStepTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [hintIdx, setHintIdx] = useState<number | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hints, setHints] = useState<Record<number, string>>(() => {
    // Restore any previously-fetched hints from localStorage
    const result: Record<number, string> = {};
    steps.forEach((_, i) => {
      const cached = localStorage.getItem(HINT_CACHE_KEY(taskId, i));
      if (cached) result[i] = cached;
    });
    return result;
  });

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const pct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  const handleAddStep = async () => {
    if (!newStepTitle.trim()) return;
    setAdding(true);
    try {
      const res = await api.post(`/tasks/${taskId}/steps`, { title: newStepTitle.trim() });
      onUpdate(res.data.steps, { percentage: pct });
      setNewStepTitle('');
    } catch {
      toast.error('Failed to add step');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (index: number) => {
    setLoadingIdx(index);
    try {
      const step = steps[index];
      const endpoint = step.isCompleted
        ? `/tasks/${taskId}/steps/${index}/uncomplete`
        : `/tasks/${taskId}/steps/${index}/complete`;
      const res = await api.patch(endpoint);
      onUpdate(res.data.steps, res.data.progress);
    } catch {
      toast.error('Failed to update step');
    } finally {
      setLoadingIdx(null);
    }
  };

  const handleDelete = async (index: number) => {
    setLoadingIdx(index);
    try {
      const res = await api.delete(`/tasks/${taskId}/steps/${index}`);
      onUpdate(res.data.steps, res.data.progress);
    } catch {
      toast.error('Failed to delete step');
    } finally {
      setLoadingIdx(null);
    }
  };

  const handleHint = async (index: number) => {
    // Toggle off if already open
    if (hintIdx === index) {
      setHintIdx(null);
      return;
    }
    // Show immediately if cached
    if (hints[index]) {
      setHintIdx(index);
      return;
    }
    setHintIdx(index);
    setHintLoading(true);
    try {
      const res = await api.post(`/tasks/${taskId}/steps/${index}/hint`);
      const text: string = res.data.hint || '';
      setHints((prev) => ({ ...prev, [index]: text }));
      // Persist for future sessions
      localStorage.setItem(HINT_CACHE_KEY(taskId, index), text);
    } catch {
      toast.error('Could not fetch hint');
      setHintIdx(null);
    } finally {
      setHintLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('tasks.steps')} {steps.length > 0 && `(${completedCount}/${steps.length})`}
        </span>
        {steps.length > 0 && (
          <span className="text-xs text-gray-500">{pct}%</span>
        )}
      </div>

      {/* Progress bar */}
      {steps.length > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="h-1.5 bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Steps list */}
      <AnimatePresence>
        {steps.map((step, idx) => (
          <motion.div
            key={step._id || idx}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 group">
              <button
                onClick={() => handleToggle(idx)}
                disabled={loadingIdx === idx}
                className="flex-shrink-0 text-gray-400 hover:text-purple-600 transition-colors"
              >
                {step.isCompleted
                  ? <CheckSquare className="w-4 h-4 text-purple-600" />
                  : <Square className="w-4 h-4" />}
              </button>
              <span className={`flex-1 text-sm ${step.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {step.title}
              </span>
              {/* Sparkle hint button */}
              <button
                onClick={() => handleHint(idx)}
                disabled={hintLoading && hintIdx === idx}
                title="ABY hint for this step"
                className={`opacity-0 group-hover:opacity-100 transition-all flex items-center gap-0.5 text-[10px] font-semibold rounded px-1 py-0.5 ${
                  hintIdx === idx
                    ? 'opacity-100 text-purple-700 bg-purple-100'
                    : 'text-gray-400 hover:text-purple-600'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>ABY</span>
              </button>
              <button
                onClick={() => handleDelete(idx)}
                disabled={loadingIdx === idx}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inline hint dropdown */}
            <AnimatePresence>
              {hintIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 overflow-hidden"
                >
                  <div className="border border-purple-100 rounded-lg bg-purple-50 dark:bg-purple-900/20 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed relative">
                    <button
                      onClick={() => setHintIdx(null)}
                      className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {hintLoading && hintIdx === idx ? (
                      <span className="text-purple-500 animate-pulse">ABY is thinking...</span>
                    ) : (
                      hints[idx] || '...'
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add new step */}
      <div className="flex items-center gap-2 mt-1">
        <input
          value={newStepTitle}
          onChange={(e) => setNewStepTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddStep(); }}
          placeholder={t('tasks.addStep')}
          className="flex-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:outline-none py-1 text-gray-700 dark:text-gray-300 placeholder-gray-400"
        />
        <button
          onClick={handleAddStep}
          disabled={!newStepTitle.trim() || adding}
          className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TaskChecklist;
