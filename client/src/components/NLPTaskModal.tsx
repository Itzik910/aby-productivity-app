import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface NLPTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

interface ParsedTask {
  title: string;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  description: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const NLPTaskModal: React.FC<NLPTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/tasks/nlp-parse', { text: input });
      setParsed(res.data.parsed);
    } catch {
      toast.error('Could not parse task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: parsed.title,
        description: parsed.description,
        dueDate: parsed.dueDate || new Date(Date.now() + 86400000).toISOString(),
        priority: parsed.priority,
        category: parsed.category,
      });
      toast.success('Task created!');
      window.dispatchEvent(new Event('taskCreated'));
      onTaskCreated?.();
      handleClose();
    } catch {
      toast.error('Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setInput('');
    setParsed(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {parsed ? 'Confirm Task' : 'Add Task with AI'}
                </h2>
              </div>
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              {!parsed ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Describe your task in plain language. ABY will extract the details.
                  </p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleParse();
                      }
                    }}
                    placeholder='e.g. "Buy flowers for Noya tomorrow urgent" or "Schedule gym session next Monday morning"'
                    rows={3}
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                  />
                  <button
                    onClick={handleParse}
                    disabled={!input.trim() || loading}
                    className="mt-3 w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Parsing...' : 'Parse with ABY'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    ABY understood your task. Review and save:
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
                      <input
                        value={parsed.title}
                        onChange={(e) => setParsed({ ...parsed, title: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</label>
                        <input
                          type="date"
                          value={parsed.dueDate || ''}
                          onChange={(e) => setParsed({ ...parsed, dueDate: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
                        <select
                          value={parsed.priority}
                          onChange={(e) => setParsed({ ...parsed, priority: e.target.value as ParsedTask['priority'] })}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        >
                          {['urgent', 'high', 'medium', 'low'].map((p) => (
                            <option key={p} value={p}>{t(`tasks.${p}`)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                      <select
                        value={parsed.category}
                        onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        {['work', 'personal', 'health', 'learning', 'social', 'finance', 'home', 'other'].map((c) => (
                          <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_COLORS[parsed.priority]}`}>
                        {parsed.priority}
                      </span>
                      {parsed.dueDate && (
                        <span className="text-xs text-gray-500">Due: {parsed.dueDate}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={() => setParsed(null)}
                      className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Re-parse
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {saving ? 'Saving...' : 'Create Task'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NLPTaskModal;
